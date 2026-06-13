import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import os from 'os';
import OpenAI from 'openai';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors());
const upload = multer({ dest: os.tmpdir() });
const PORT = 3000;

app.use(express.json());

// Helper functions for ASS subtitle generation
function convertHexToBGR(hex: string) {
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = hex.slice(0, 2);
  const g = hex.slice(2, 4);
  const b = hex.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

function formatTimeASS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function generateASS(segments: any[], settings: any) {
  const alignMap: Record<string, string> = { top: '8', center: '5', bottom: '2' };
  const alignment = alignMap[settings.position] || '2';
  const color = convertHexToBGR(settings.color || '#ffffff');
  const fontName = settings.font || 'Inter';
  const fontSize = 24 * (settings.zoom / 100);
  
  let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${color},&H000000FF,&H00000000,&H99000000,0,0,0,0,100,100,0,0,1,2,1,${alignment},10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const seg of segments) {
    const start = formatTimeASS(seg.start);
    const end = formatTimeASS(seg.end);
    const text = seg.text.replace(/\n/g, '\\N');
    ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  }
  return ass;
}

// API routes for Gemini demo
import { GoogleGenAI } from '@google/genai';

app.post('/api/gemini/split', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an AI that splits a video transcript into subtitle segments.
Please return a JSON array of objects. Each object must have:
- "id": a unique number starting from 1
- "start": start time in seconds (number, approximate based on reading speed, e.g., 0, 2.5, etc.)
- "end": end time in seconds (number)
- "text": the original text for this segment (short enough to fit on screen)
Only return the JSON array, no markdown formatting.

Transcript:
${transcript}`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text || '[]');
    res.json({ segments: data });
  } catch (error) {
    console.error('Gemini split error:', error);
    res.status(500).json({ error: 'Failed to split transcript using Gemini' });
  }
});

app.post('/api/gemini/translate', async (req, res) => {
  const { segments, targetLanguage } = req.body;
  if (!segments || !targetLanguage) {
    return res.status(400).json({ error: 'Segments and targetLanguage are required' });
  }
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const textData = JSON.stringify(segments.map((s: any) => ({ id: s.id, text: s.text })));
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a translator. Translate the following subtitle texts into ${targetLanguage}.
Please return a JSON array of objects. Each object must have:
- "id": the exact same id as the input
- "translatedText": the translated text
Only return the JSON array, no markdown formatting.

Subtitles:
${textData}`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const tData = JSON.parse(response.text || '[]');
    const translatedSegments = segments.map((s: any) => {
      const match = tData.find((t: any) => t.id === s.id);
      return {
        ...s,
        translatedText: match ? match.translatedText : s.text,
      };
    });

    res.json({ segments: translatedSegments });
  } catch (error) {
    console.error('Gemini translate error:', error);
    res.status(500).json({ error: 'Failed to translate using Gemini' });
  }
});

// API route for extracting audio and transcribing
app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const videoPath = req.file.path;
  const audioPath = `${videoPath}.mp3`;

  try {
    console.log('Extracting audio to', audioPath);
    // Extract audio
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('mp3')
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(audioPath);
    });

    console.log('Audio extracted successfully. Transcribing...');
    let segmentsData: any[] = [];

    // Check for OpenAI API Key
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const openai = new OpenAI({ apiKey });
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
      });
      console.log('Transcription successful');
      
      // Map OpenAI format to our app format
      if (transcription.segments) {
        segmentsData = transcription.segments.map((seg: any) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
        }));
      } else {
        // Fallback if segments are not returned correctly
        segmentsData = [
          { id: 0, start: 0, end: 5, text: transcription.text }
        ];
      }
    } else {
      console.log('No OPENAI_API_KEY found, using mock transcription.');
      // Wait a moment to simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      segmentsData = [
        { id: 1, start: 0, end: 3.5, text: "Xin chào, chào mừng bạn đến với AI Subtitle." },
        { id: 2, start: 3.5, end: 7.2, text: "Đây là phụ đề được tạo hoàn toàn tự động." },
        { id: 3, start: 7.2, end: 11.0, text: "Hệ thống hỗ trợ nhiều ngôn ngữ và nhiều mô hình." },
        { id: 4, start: 11.0, end: 15.5, text: "Cảm ơn bạn đã sử dụng nền tảng của chúng tôi." }
      ];
    }

    res.json({ segments: segmentsData });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to process video' });
  } finally {
    // Cleanup temporary files
    try {
      await fs.unlink(videoPath);
      await fs.unlink(audioPath).catch(() => {}); // Ignore if audio wasn't created
    } catch (e) {
      console.error('Failed to cleanup temp files', e);
    }
  }
});

// API route for exporting video with burned-in subtitles
app.post('/api/export', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  const videoPath = req.file.path;
  const assPath = `${videoPath}.ass`;
  const outputPath = `${videoPath}_out.mp4`;
  let cleanupFiles: string[] = [videoPath, assPath, outputPath];

  try {
    const segments = JSON.parse(req.body.segments || '[]');
    const settings = JSON.parse(req.body.settings || '{}');

    // Create ASS file
    const assContent = generateASS(segments, settings);
    await fs.writeFile(assPath, assContent, 'utf-8');

    console.log('Preparing video export...', outputPath);

    let finalFfmpeg = ffmpeg(videoPath);
    let vFilterParts = [];
    if (settings.zoom && settings.zoom !== 100) {
      const z = settings.zoom / 100;
      vFilterParts.push(`scale=iw*${z}:ih*${z}`);
      vFilterParts.push(`crop=iw/${z}:ih/${z}`);
    }
    if (settings.flipHorizontal) {
      vFilterParts.push('hflip');
    }
    
    // Properly escape ass filter path
    // Escaping backslashes and colons is required for FFmpeg on Windows, but our environment is Linux based so it is simpler.
    // Replace single quotes with '' just in case.
    const escapedAssPath = assPath.replace(/'/g, "\\\\'");
    vFilterParts.push(`ass='${escapedAssPath}'`);
    const vf = vFilterParts.join(',');

    if (settings.enableDubbing && segments.length > 0) {
      console.log('Generating TTS dubbing...');
      const { EdgeTTS } = await import('node-edge-tts');
      const tts = new EdgeTTS({ voice: settings.dubbingVoice || 'vi-VN-HoaiMyNeural' });

      const ttsFiles = [];
      let filterComplex = `[0:v]${vf}[vout]`;
      let delayFilters = [];
      let amixInputs = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!seg.text) continue;
        const ttsAudioPath = `${videoPath}_tts_${i}.mp3`;
        
        // If tts errors, we just skip that segment
        try {
          await tts.ttsPromise(seg.text.replace(/\n/g, ' '), ttsAudioPath);
          ttsFiles.push(ttsAudioPath);
          cleanupFiles.push(ttsAudioPath);

          finalFfmpeg = finalFfmpeg.input(ttsAudioPath);
          const inputIdx = ttsFiles.length; // 1-indexed for audio
          const delayMs = Math.floor(seg.start * 1000);
          delayFilters.push(`[${inputIdx}:a]adelay=${delayMs}|${delayMs}[a${inputIdx}]`);
          amixInputs++;
        } catch (err) {
          console.error(`TTS failed for segment ${i}:`, err);
        }
      }

      if (ttsFiles.length > 0) {
        if (delayFilters.length > 0) {
          filterComplex += ';' + delayFilters.join(';');
        }
        
        const vol = (settings.volume || 100) / 100;
        
        if (settings.keepOriginalAudio) {
          filterComplex += `;[0:a]volume=${vol}[orig]`;
          filterComplex += `;[orig]` + ttsFiles.map((_, i) => `[a${i + 1}]`).join('') + `amix=inputs=${amixInputs + 1}:normalize=0[aout]`;
        } else {
          if (amixInputs === 1) {
             filterComplex += `;[a1]volume=${vol}[aout]`;
          } else {
             filterComplex += `;` + ttsFiles.map((_, i) => `[a${i + 1}]`).join('') + `amix=inputs=${amixInputs}:normalize=0[amixed];[amixed]volume=${vol}[aout]`;
          }
        }

        finalFfmpeg = finalFfmpeg.complexFilter(filterComplex).outputOptions(['-map [vout]', '-map [aout]']);
      } else {
        // Fallback if all TTS failed
        finalFfmpeg = finalFfmpeg.videoFilters(vf);
        if (!settings.keepOriginalAudio) {
          finalFfmpeg = finalFfmpeg.noAudio();
        } else {
          finalFfmpeg = finalFfmpeg.audioFilters(`volume=${(settings.volume || 100) / 100}`);
        }
      }
    } else {
      finalFfmpeg = finalFfmpeg.videoFilters(vf);
      if (!settings.keepOriginalAudio) {
        finalFfmpeg = finalFfmpeg.noAudio();
      } else {
        finalFfmpeg = finalFfmpeg.audioFilters(`volume=${(settings.volume || 100) / 100}`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      finalFfmpeg
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .save(outputPath);
    });

    console.log('Video export successful');

    res.download(outputPath, 'video_subtitled.mp4', async (err) => {
      for (const file of cleanupFiles) {
        await fs.unlink(file).catch(() => {});
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export video' });
    for (const file of cleanupFiles) {
      await fs.unlink(file).catch(() => {});
    }
  }
});

async function startServer() {
  // Setup Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
