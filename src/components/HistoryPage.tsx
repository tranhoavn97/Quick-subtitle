import { FileVideo, Search, Calendar, ChevronRight, CheckCircle, Clock, XCircle, Trash2, Download } from 'lucide-react';
import React from 'react';
import { HistoryItem } from '../types';

interface HistoryPageProps {
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

export function HistoryPage({ history, setHistory }: HistoryPageProps) {

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
  };

  const getStatusText = (status: string) => {
    if (status === 'completed') return 'Hoàn thành';
    if (status === 'error') return 'Lỗi';
    return 'Đang xử lý';
  };

  const formattedHistory = [...history].reverse(); // newest first

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/30 p-6 overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Lịch sử xuất</h1>
            <p className="text-zinc-500 text-sm">Quản lý các video đã được tạo phụ đề AI của bạn.</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm video..." 
              className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 text-sm focus:outline-none focus:border-yellow-500 transition-colors w-full sm:w-64"
            />
          </div>
        </div>

        <div className="bg-black border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">Tên file</th>
                  <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">Ngày xử lý</th>
                  <th className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {formattedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-yellow-500 group-hover:border-yellow-500/50 transition-colors">
                          <FileVideo size={16} />
                        </div>
                        <span className="text-zinc-200 font-medium">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <Calendar size={14} />
                        <span>{new Date(item.date).toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className={`text-[11px] font-bold tracking-wide uppercase ${
                          item.status === 'completed' ? 'text-green-500' :
                          item.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`}>
                          {getStatusText(item.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.url && item.status === 'completed' && (
                          <a 
                            href={item.url}
                            download={`exported_${item.name}`}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            title="Tải về"
                          >
                            <Download size={18} />
                          </a>
                        )}
                        <button 
                           onClick={() => handleDelete(item.id)}
                           className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                           title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {formattedHistory.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <Clock className="w-12 h-12 text-zinc-800 mb-4" />
              <p className="text-zinc-500">Chưa có video nào trong lịch sử</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
