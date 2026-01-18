import { useState, useMemo, useEffect, useRef, useCallback, useId } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ChatNode } from '../../../types';

interface SearchModalProps {
  onClose: () => void;
}

// SVG Icons
const Icons = {
  search: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6" />
      <path d="M18 18l-4-4" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14a6 6 0 0112 0" />
    </svg>
  ),
  assistant: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="2" width="12" height="10" rx="2" />
      <circle cx="5.5" cy="7" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l8 8M13 5l-8 8" />
    </svg>
  ),
};

export default function SearchModal({ onClose }: SearchModalProps) {
  const { nodes, selectNode } = useCanvasStore();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'assistant'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputId = useId();
  const filterSelectId = useId();

  // Debounced search for performance
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    return nodes.filter((node) => {
      const matchesQuery =
        node.content.toLowerCase().includes(lowerQuery) ||
        node.summary.toLowerCase().includes(lowerQuery);
      const matchesType = filterType === 'all' || node.type === filterType;
      return matchesQuery && matchesType;
    });
  }, [nodes, debouncedQuery, filterType]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleSelect = useCallback((node: ChatNode) => {
    selectNode(node.id);
    onClose();
  }, [selectNode, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [searchResults, selectedIndex, handleSelect, onClose]);

  // Focus trap and escape handling
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    try {
      const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={i} className="bg-[var(--accent-primary)]/40 text-[var(--text-primary)] rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--border-default)] animate-slide-in"
        onKeyDown={handleKeyDown}
      >
        <h2 id="search-modal-title" className="sr-only">대화 검색</h2>

        {/* 검색 입력 */}
        <div className="p-4 border-b border-[var(--border-default)]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <label htmlFor={searchInputId} className="sr-only">검색어 입력</label>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {Icons.search}
              </div>
              <input
                ref={inputRef}
                id={searchInputId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="대화 내용 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                autoFocus
                aria-describedby="search-results-count"
              />
            </div>
            <div>
              <label htmlFor={filterSelectId} className="sr-only">필터 유형</label>
              <select
                id={filterSelectId}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'user' | 'assistant')}
                className="px-3 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              >
                <option value="all">전체</option>
                <option value="user">사용자</option>
                <option value="assistant">AI</option>
              </select>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] rounded-[var(--radius-md)] transition-colors"
              aria-label="검색 닫기"
            >
              {Icons.close}
            </button>
          </div>
        </div>

        {/* 검색 결과 */}
        <div
          className="max-h-96 overflow-y-auto"
          role="listbox"
          aria-label="검색 결과"
        >
          {debouncedQuery.trim() && searchResults.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              검색 결과가 없습니다.
            </div>
          ) : (
            searchResults.map((node, index) => (
              <div
                key={node.id}
                onClick={() => handleSelect(node)}
                onMouseEnter={() => setSelectedIndex(index)}
                role="option"
                aria-selected={index === selectedIndex}
                className={`
                  p-3 border-b border-[var(--border-default)] cursor-pointer transition-colors
                  ${index === selectedIndex
                    ? 'bg-[var(--accent-primary)]/10'
                    : 'hover:bg-[var(--bg-hover)]'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={node.type === 'user' ? 'text-[var(--accent-primary)]' : 'text-[var(--accent-secondary)]'}>
                    {node.type === 'user' ? Icons.user : Icons.assistant}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {node.model || node.type}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(node.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-primary)] line-clamp-2">
                  {highlightText(node.content, debouncedQuery)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 결과 수 및 키보드 힌트 */}
        {debouncedQuery.trim() && (
          <div
            id="search-results-count"
            className="p-2 border-t border-[var(--border-default)] flex items-center justify-between text-sm text-[var(--text-muted)]"
          >
            <span>{searchResults.length}개 결과</span>
            <span className="text-xs">
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-muted)]">↑↓</kbd>
              {' 탐색 '}
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-muted)]">Enter</kbd>
              {' 선택 '}
              <kbd className="px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[var(--text-muted)]">Esc</kbd>
              {' 닫기'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
