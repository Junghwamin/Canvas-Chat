import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';

interface SidebarProps {
  onOpenSettings: () => void;
}

// SVG Icons
const Icons = {
  menu: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 2l2 2-7 7H3v-2l7-7z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a2 2 0 01-2 2H5a2 2 0 01-2-2V4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="3" />
      <path d="M14.5 9a5.5 5.5 0 00-.5-2l1.5-1.5-1.5-1.5L12.5 5.5a5.5 5.5 0 00-2-.5V3h-3v2a5.5 5.5 0 00-2 .5L4 4 2.5 5.5 4 7a5.5 5.5 0 00-.5 2H1.5v3h2a5.5 5.5 0 00.5 2L2.5 15.5 4 17l1.5-1.5a5.5 5.5 0 002 .5v2h3v-2a5.5 5.5 0 002-.5L14 17l1.5-1.5L14 14a5.5 5.5 0 00.5-2h2v-3h-2z" />
    </svg>
  ),
  canvas: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="16" height="16" rx="2" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="13" cy="13" r="2" />
      <path d="M7 9v4h6" />
    </svg>
  ),
};

// Memoized canvas item component
const CanvasItem = memo(({
  canvas,
  isActive,
  isEditing,
  editName,
  onSelect,
  onStartEdit,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  canvas: { id: string; name: string; updatedAt: Date };
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onEditNameChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`캔버스: ${canvas.name}`}
      className={`
        group mb-1 p-2 rounded-[var(--radius-md)] cursor-pointer transition-all duration-[var(--transition-fast)]
        ${isActive
          ? 'bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/50'
          : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-transparent'
        }
      `}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {isEditing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onCancelEdit}
            className="w-full px-2 py-1 bg-[var(--bg-base)] border border-[var(--border-hover)] rounded-[var(--radius-sm)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)]"
            aria-label="캔버스 이름 편집"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--text-primary)] truncate">
              {canvas.name}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {new Date(canvas.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="hidden group-hover:flex gap-1" role="group" aria-label="캔버스 액션">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="이름 변경"
            >
              {Icons.edit}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors"
              aria-label="삭제"
            >
              {Icons.trash}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

CanvasItem.displayName = 'CanvasItem';

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const {
    canvases,
    currentCanvas,
    selectCanvas,
    createCanvas,
    deleteCanvas,
    updateCanvas,
  } = useCanvasStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const newCanvasInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && newCanvasInputRef.current) {
      newCanvasInputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = useCallback(async () => {
    if (!newCanvasName.trim()) return;

    await createCanvas(newCanvasName.trim());
    setNewCanvasName('');
    setIsCreating(false);
  }, [newCanvasName, createCanvas]);

  const handleRename = useCallback(async (id: string) => {
    if (!editName.trim()) return;

    await updateCanvas(id, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
  }, [editName, updateCanvas]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('이 캔버스를 삭제하시겠습니까? 모든 대화가 삭제됩니다.')) {
      await deleteCanvas(id);
    }
  }, [deleteCanvas]);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--accent-primary)]">{Icons.canvas}</span>
            <span>Canvas Chat</span>
          </h1>
          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            aria-label="사이드바 닫기"
          >
            {Icons.close}
          </button>
        </div>
      </div>

      {/* Canvas list */}
      <nav
        className="flex-1 overflow-y-auto"
        role="navigation"
        aria-label="캔버스 목록"
      >
        <div className="p-2">
          {/* New canvas button/form */}
          {isCreating ? (
            <div className="mb-2 p-2 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-default)]">
              <input
                ref={newCanvasInputRef}
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                placeholder="캔버스 이름..."
                className="w-full px-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                aria-label="새 캔버스 이름"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  disabled={!newCanvasName.trim()}
                  className="flex-1 px-2 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-medium rounded-[var(--radius-sm)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  생성
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-2 py-1.5 bg-[var(--bg-hover)] text-[var(--text-secondary)] text-xs font-medium rounded-[var(--radius-sm)] hover:bg-[var(--border-hover)] transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full mb-2 px-3 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-[var(--radius-md)] text-sm font-medium transition-colors flex items-center justify-center gap-2"
              aria-label="새 캔버스 만들기"
            >
              {Icons.plus}
              <span>새 캔버스</span>
            </button>
          )}

          {/* Canvas list */}
          <div role="listbox" aria-label="캔버스 목록">
            {canvases.map((canvas) => (
              <CanvasItem
                key={canvas.id}
                canvas={canvas}
                isActive={currentCanvas?.id === canvas.id}
                isEditing={editingId === canvas.id}
                editName={editName}
                onSelect={() => {
                  selectCanvas(canvas.id);
                  setIsOpen(false); // Close on mobile
                }}
                onStartEdit={() => {
                  setEditingId(canvas.id);
                  setEditName(canvas.name);
                }}
                onEditNameChange={setEditName}
                onSaveEdit={() => handleRename(canvas.id)}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditName('');
                }}
                onDelete={() => handleDelete(canvas.id)}
              />
            ))}
          </div>

          {canvases.length === 0 && !isCreating && (
            <div className="text-center text-[var(--text-muted)] text-sm py-8 px-4">
              <div className="mb-2 text-4xl opacity-50">
                {Icons.canvas}
              </div>
              캔버스가 없습니다.
              <br />
              새 캔버스를 만들어보세요!
            </div>
          )}
        </div>
      </nav>

      {/* Settings button */}
      <div className="p-2 border-t border-[var(--border-default)]">
        <button
          onClick={onOpenSettings}
          className="w-full px-3 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-md)] text-sm flex items-center gap-2 transition-colors"
          aria-label="설정 열기"
        >
          {Icons.settings}
          <span>설정</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden p-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]"
        aria-label="메뉴 열기"
        aria-expanded={isOpen}
        aria-controls="sidebar"
      >
        {Icons.menu}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          w-64 h-full
          bg-[var(--bg-surface)] border-r border-[var(--border-default)]
          flex flex-col
          transform transition-transform duration-[var(--transition-normal)] ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="사이드바"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
