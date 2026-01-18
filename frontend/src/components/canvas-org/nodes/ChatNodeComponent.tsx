import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { NodeData } from '../../../types';
import MarkdownRenderer from '../ui/MarkdownRenderer';

// SVG Icons for consistent rendering
const Icons = {
  user: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="4.5" r="3" />
      <path d="M2 14a6 6 0 0112 0" />
    </svg>
  ),
  assistant: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="2" width="12" height="9" rx="2" />
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  ),
  system: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M12 8a4 4 0 00-.5-1.5l1-1-1-1L10 5.5A4 4 0 008.5 5V3.5h-1V5A4 4 0 006 5.5L4.5 4.5l-1 1 1 1A4 4 0 004 8H2.5v1H4a4 4 0 00.5 1.5l-1 1 1 1L6 10.5a4 4 0 001.5.5v1.5h1V11a4 4 0 001.5-.5l1.5 1 1-1-1-1A4 4 0 0012 8h1.5V8H12z" />
    </svg>
  ),
  add: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M10 2l2 2-7 7H3v-2l7-7z" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a2 2 0 01-2 2H5a2 2 0 01-2-2V4" />
    </svg>
  ),
  folderOpen: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1 4v7a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H7L5 2H2a1 1 0 00-1 1v1" />
    </svg>
  ),
  folderClosed: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1 4v7a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H7L5 2H2a1 1 0 00-1 1v1" />
      <path d="M1 6h12" />
    </svg>
  ),
  expand: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 5l3 3 3-3" />
    </svg>
  ),
  collapse: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 7l3-3 3 3" />
    </svg>
  ),
  token: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M6 1l1.5 3.5L11 5l-2.5 2.5L9 11l-3-1.5L3 11l.5-3.5L1 5l3.5-.5L6 1z" />
    </svg>
  ),
  attachment: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M9.5 6.5l-3.5 3.5a2.5 2.5 0 01-3.5-3.5l5-5a1.5 1.5 0 012.1 2.1l-4.5 4.5" />
    </svg>
  ),
  hidden: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2 4l4 4 4-4" />
    </svg>
  ),
};

const ChatNodeComponent = memo(({ data, selected }: NodeProps & { data: NodeData }) => {
  const { chatNode, childCount, onAddChild, onEdit, onDelete, onToggleCollapse } = data as NodeData;
  const [isExpanded, setIsExpanded] = useState(false);

  // 통일된 테마 색상 사용
  const getNodeStyle = () => {
    switch (chatNode.type) {
      case 'user':
        return 'bg-gradient-to-br from-[var(--node-user)]/90 to-[var(--node-user)]/70 border-[var(--node-user-border)]/50';
      case 'assistant':
        return 'bg-gradient-to-br from-[var(--node-assistant)]/90 to-[var(--node-assistant)]/70 border-[var(--node-assistant-border)]/50';
      case 'system':
        return 'bg-gradient-to-br from-[var(--node-system)]/90 to-[var(--node-system)]/70 border-[var(--node-system-border)]/50';
      default:
        return 'bg-gradient-to-br from-[var(--node-system)]/90 to-[var(--node-system)]/70 border-[var(--node-system-border)]/50';
    }
  };

  const getNodeIcon = () => {
    switch (chatNode.type) {
      case 'user':
        return Icons.user;
      case 'assistant':
        return Icons.assistant;
      case 'system':
        return Icons.system;
      default:
        return Icons.user;
    }
  };

  const getAccentColor = () => {
    switch (chatNode.type) {
      case 'user':
        return 'text-[var(--accent-primary)]';
      case 'assistant':
        return 'text-[var(--accent-secondary)]';
      case 'system':
        return 'text-[var(--text-muted)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const displayContent = isExpanded
    ? chatNode.content
    : chatNode.summary || chatNode.content.substring(0, 150);

  const hasChildren = childCount > 0;
  const isCollapsed = chatNode.isCollapsed;

  return (
    <div
      className={`
        min-w-[220px] max-w-[400px] rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)]
        ${getNodeStyle()}
        ${selected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-base)]' : ''}
        ${isCollapsed ? 'opacity-90' : ''}
        backdrop-blur-sm
        transition-all duration-[var(--transition-fast)] ease-out
        hover:shadow-[var(--shadow-glow)]
        node-card
      `}
      role="article"
      aria-label={`${chatNode.type} 메시지`}
    >
      {/* 입력 핸들 */}
      {chatNode.parentId && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-[var(--accent-primary)] border-2 !border-[var(--accent-primary)]/70 shadow-lg shadow-[var(--accent-primary)]/30"
        />
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className={getAccentColor()}>{getNodeIcon()}</span>
          <span className={`text-xs font-medium ${getAccentColor()}`}>
            {chatNode.type === 'assistant' && chatNode.model ? chatNode.model : chatNode.type}
          </span>
        </div>
        <div className="flex gap-0.5" role="group" aria-label="노드 액션">
          {/* 접기/펼치기 버튼 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(chatNode.id);
              }}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-all ${isCollapsed
                  ? 'bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/30'
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              title={isCollapsed ? `펼치기 (${childCount}개 노드)` : '접기'}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? `펼치기 (${childCount}개 노드)` : '접기'}
            >
              <span className="flex items-center gap-1">
                {isCollapsed ? Icons.folderClosed : Icons.folderOpen}
                {isCollapsed && <span className="text-xs">{childCount}</span>}
              </span>
            </button>
          )}
          <button
            onClick={() => onAddChild(chatNode.id)}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="새 질문 추가"
            aria-label="새 질문 추가"
          >
            {Icons.add}
          </button>
          <button
            onClick={() => onEdit(chatNode.id)}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="편집"
            aria-label="편집"
          >
            {Icons.edit}
          </button>
          <button
            onClick={() => onDelete(chatNode.id)}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/10 text-white/70 hover:text-[var(--accent-danger)] transition-colors"
            title="삭제"
            aria-label="삭제"
          >
            {Icons.trash}
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={isExpanded}
        aria-label="내용 확장/축소"
      >
        <div className={`${isExpanded ? '' : 'line-clamp-6'}`}>
          {chatNode.type === 'assistant' ? (
            <MarkdownRenderer content={displayContent} />
          ) : (
            <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
          )}
        </div>
        {chatNode.content.length > 150 && (
          <button className={`text-xs mt-2 ${getAccentColor()} hover:underline font-medium flex items-center gap-1`}>
            {isExpanded ? (
              <>접기 {Icons.collapse}</>
            ) : (
              <>더 보기 {Icons.expand}</>
            )}
          </button>
        )}
      </div>

      {/* 접힌 상태 표시 */}
      {isCollapsed && childCount > 0 && (
        <div className="px-4 py-2 text-xs text-[var(--accent-warning)] border-t border-white/10 bg-[var(--accent-warning)]/10 rounded-b-[var(--radius-lg)] flex items-center gap-1.5">
          {Icons.hidden}
          {childCount}개 노드 숨김
        </div>
      )}

      {/* 토큰 정보 */}
      {chatNode.tokenCount && !isCollapsed && (
        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-t border-white/10 flex items-center gap-1.5">
          <span className="text-[var(--accent-primary)]">{Icons.token}</span>
          {chatNode.tokenCount.toLocaleString()} tokens
        </div>
      )}

      {/* 첨부파일 표시 */}
      {chatNode.attachments && chatNode.attachments.length > 0 && !isCollapsed && (
        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-t border-white/10 flex items-center gap-1.5">
          {Icons.attachment}
          {chatNode.attachments.length}개 파일 첨부
        </div>
      )}

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 border-2 shadow-lg ${isCollapsed
            ? '!bg-[var(--accent-warning)] !border-[var(--accent-warning)]/70 shadow-[var(--accent-warning)]/30'
            : '!bg-[var(--accent-primary)] !border-[var(--accent-primary)]/70 shadow-[var(--accent-primary)]/30'
          }`}
      />
    </div>
  );
});

ChatNodeComponent.displayName = 'ChatNodeComponent';

export default ChatNodeComponent;
