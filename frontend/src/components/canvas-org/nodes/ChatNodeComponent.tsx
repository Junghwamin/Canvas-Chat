import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { NodeData } from '../../../types';
import MarkdownRenderer from '../ui/MarkdownRenderer';

const ChatNodeComponent = memo(({ data, selected }: NodeProps & { data: NodeData }) => {
  const { chatNode, childCount, onAddChild, onEdit, onDelete, onToggleCollapse } = data as NodeData;
  const [isExpanded, setIsExpanded] = useState(false);

  // 새로운 연구자 친화적 색상
  const getNodeStyle = () => {
    switch (chatNode.type) {
      case 'user':
        return 'bg-gradient-to-br from-blue-900/90 to-blue-950/90 border-blue-500/50';
      case 'assistant':
        return 'bg-gradient-to-br from-violet-900/90 to-purple-950/90 border-violet-500/50';
      case 'system':
        return 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-500/50';
      default:
        return 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-500/50';
    }
  };

  const getNodeIcon = () => {
    switch (chatNode.type) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'system':
        return '⚙️';
      default:
        return '💬';
    }
  };

  const getAccentColor = () => {
    switch (chatNode.type) {
      case 'user':
        return 'text-blue-400';
      case 'assistant':
        return 'text-violet-400';
      case 'system':
        return 'text-slate-400';
      default:
        return 'text-slate-400';
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
        min-w-[220px] max-w-[400px] rounded-xl border shadow-xl
        ${getNodeStyle()}
        ${selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : ''}
        ${isCollapsed ? 'opacity-90' : ''}
        backdrop-blur-sm
        transition-all duration-200 ease-out
        hover:shadow-2xl hover:shadow-cyan-500/10
        node-card
      `}
    >
      {/* 입력 핸들 */}
      {chatNode.parentId && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 !bg-cyan-400 border-2 !border-cyan-300 shadow-lg shadow-cyan-400/30"
        />
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getNodeIcon()}</span>
          <span className={`text-xs font-medium ${getAccentColor()}`}>
            {chatNode.type === 'assistant' && chatNode.model ? chatNode.model : chatNode.type}
          </span>
        </div>
        <div className="flex gap-1">
          {/* 접기/펼치기 버튼 */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(chatNode.id);
              }}
              className={`p-1.5 text-xs rounded-lg transition-all ${isCollapsed
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
              title={isCollapsed ? `펼치기 (${childCount}개 노드)` : '접기'}
            >
              {isCollapsed ? `📂 ${childCount}` : '📁'}
            </button>
          )}
          <button
            onClick={() => onAddChild(chatNode.id)}
            className="p-1.5 text-xs rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="새 질문 추가"
          >
            ➕
          </button>
          <button
            onClick={() => onEdit(chatNode.id)}
            className="p-1.5 text-xs rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="편집"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(chatNode.id)}
            className="p-1.5 text-xs rounded-lg hover:bg-white/10 text-white/70 hover:text-red-400 transition-colors"
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div
        className="px-4 py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`${isExpanded ? '' : 'line-clamp-6'}`}>
          {chatNode.type === 'assistant' ? (
            <MarkdownRenderer content={displayContent} />
          ) : (
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {displayContent}
            </p>
          )}
        </div>
        {chatNode.content.length > 150 && (
          <button className={`text-xs mt-2 ${getAccentColor()} hover:underline font-medium`}>
            {isExpanded ? '접기 ▲' : '더 보기 ▼'}
          </button>
        )}
      </div>

      {/* 접힌 상태 표시 */}
      {isCollapsed && childCount > 0 && (
        <div className="px-4 py-2 text-xs text-amber-400 border-t border-white/10 bg-amber-500/10 rounded-b-xl">
          🔽 {childCount}개 노드 숨김
        </div>
      )}

      {/* 토큰 정보 */}
      {chatNode.tokenCount && !isCollapsed && (
        <div className="px-4 py-2 text-xs text-slate-400 border-t border-white/10 flex items-center gap-2">
          <span className="text-cyan-400">◆</span>
          {chatNode.tokenCount.toLocaleString()} tokens
        </div>
      )}

      {/* 첨부파일 표시 */}
      {chatNode.attachments && chatNode.attachments.length > 0 && !isCollapsed && (
        <div className="px-4 py-2 text-xs text-slate-400 border-t border-white/10">
          📎 {chatNode.attachments.length}개 파일 첨부
        </div>
      )}

      {/* 출력 핸들 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 border-2 shadow-lg ${isCollapsed
            ? '!bg-amber-400 !border-amber-300 shadow-amber-400/30'
            : '!bg-cyan-400 !border-cyan-300 shadow-cyan-400/30'
          }`}
      />
    </div>
  );
});

ChatNodeComponent.displayName = 'ChatNodeComponent';

export default ChatNodeComponent;
