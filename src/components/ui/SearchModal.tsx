import { useState, useMemo } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ChatNode } from '../../types';

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const { nodes, selectNode } = useCanvasStore();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'assistant'>('all');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return nodes.filter((node) => {
      const matchesQuery =
        node.content.toLowerCase().includes(lowerQuery) ||
        node.summary.toLowerCase().includes(lowerQuery);
      const matchesType = filterType === 'all' || node.type === filterType;
      return matchesQuery && matchesType;
    });
  }, [nodes, query, filterType]);

  const handleSelect = (node: ChatNode) => {
    selectNode(node.id);
    onClose();
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-pink-500/50 text-white">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl">
        {/* 검색 입력 */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="대화 내용 검색..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500"
              autoFocus
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              <option value="all">전체</option>
              <option value="user">사용자</option>
              <option value="assistant">AI</option>
            </select>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() && searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            searchResults.map((node) => (
              <div
                key={node.id}
                onClick={() => handleSelect(node)}
                className="p-3 border-b border-gray-700 hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{node.type === 'user' ? '👤' : '🤖'}</span>
                  <span className="text-xs text-gray-400">
                    {node.model || node.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(node.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-white line-clamp-2">
                  {highlightText(node.content, query)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 결과 수 */}
        {query.trim() && (
          <div className="p-2 border-t border-gray-700 text-center text-sm text-gray-400">
            {searchResults.length}개 결과
          </div>
        )}
      </div>
    </div>
  );
}
