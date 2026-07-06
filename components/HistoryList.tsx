import React from 'react';
import { HistoryItem } from '../types';
import { Trash2, Clock, X } from 'lucide-react';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete, onClear, onClose }) => {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-[85vw] sm:w-80 sm:max-w-none bg-zinc-950 border-l border-zinc-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
      <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/95 backdrop-blur-sm">
        <div className="flex items-center space-x-2 text-white">
          <Clock className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-lg">Histórico</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-8 text-zinc-600">
            <p>Nenhuma análise salva ainda.</p>
          </div>
        ) : (
          history.map((item) => (
            <div 
              key={item.id}
              className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-all cursor-pointer"
              onClick={() => onSelect(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-zinc-500">
                  {new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 md:p-1 -m-1 md:m-0 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded transition-all"
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <p className="text-sm text-zinc-300 font-medium line-clamp-2 mb-2">
                {item.preview || "Análise de Áudio"}
              </p>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-zinc-950/50 px-2 py-0.5 rounded text-xs">
                  <span className="text-zinc-400">Score:</span>
                  <span className={`font-bold ${
                    item.result.overallScore >= 80 ? 'text-lime-400' :
                    item.result.overallScore >= 60 ? 'text-zinc-300' : 'text-zinc-500'
                  }`}>
                    {item.result.overallScore}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {history.length > 0 && (
        <div className="p-4 border-t border-zinc-900 bg-zinc-950/95 backdrop-blur-sm">
          <button
            onClick={onClear}
            className="w-full py-2 px-4 flex items-center justify-center space-x-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Histórico</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
