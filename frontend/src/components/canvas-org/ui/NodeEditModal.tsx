import { useState, useEffect, useId } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import { generateSummary } from '../../../services/llmService';
import Modal, { ModalButton } from '../../ui/Modal';
import Spinner from '../../ui/Spinner';

interface NodeEditModalProps {
  nodeId: string;
  onClose: () => void;
}

// SVG Icons for node types
const NodeTypeIcons = {
  user: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="5" r="3.5" />
      <path d="M2 16a7 7 0 0114 0" />
    </svg>
  ),
  assistant: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="2" width="14" height="11" rx="2" />
      <circle cx="6" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),
  system: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="9" r="3" />
      <path d="M14.5 9a5.5 5.5 0 00-.5-2l1.5-1.5-1.5-1.5L12.5 5.5a5.5 5.5 0 00-2-.5V3h-3v2a5.5 5.5 0 00-2 .5L4 4 2.5 5.5 4 7a5.5 5.5 0 00-.5 2H1.5v3h2a5.5 5.5 0 00.5 2L2.5 15.5 4 17l1.5-1.5a5.5 5.5 0 002 .5v2h3v-2a5.5 5.5 0 002-.5L14 17l1.5-1.5L14 14a5.5 5.5 0 00.5-2h2v-3h-2z" />
    </svg>
  ),
};

export default function NodeEditModal({ nodeId, onClose }: NodeEditModalProps) {
  const { nodes, updateNode, deleteNode, settings } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);

  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const summaryInputId = useId();
  const contentTextareaId = useId();

  useEffect(() => {
    if (node) {
      setContent(node.content);
      setSummary(node.summary);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 요약이 비어있으면 자동 생성
      let finalSummary = summary;
      if (!summary.trim() && content.trim()) {
        finalSummary = await generateSummary(content, {
          openai: settings.openaiKey,
          google: settings.googleKey,
        });
      }

      await updateNode(nodeId, {
        content,
        summary: finalSummary,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('이 노드와 하위 노드를 모두 삭제하시겠습니까?')) {
      await deleteNode(nodeId);
      onClose();
    }
  };

  const getNodeTypeInfo = () => {
    switch (node.type) {
      case 'user':
        return { icon: NodeTypeIcons.user, label: '사용자 메시지', color: 'var(--accent-primary)' };
      case 'assistant':
        return { icon: NodeTypeIcons.assistant, label: 'AI 응답', color: 'var(--accent-secondary)' };
      case 'system':
        return { icon: NodeTypeIcons.system, label: '시스템 프롬프트', color: 'var(--text-muted)' };
      default:
        return { icon: NodeTypeIcons.user, label: '메시지', color: 'var(--text-primary)' };
    }
  };

  const nodeTypeInfo = getNodeTypeInfo();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${nodeTypeInfo.label}`}
      maxWidth="2xl"
      footer={
        <div className="flex justify-between w-full">
          <ModalButton variant="danger" onClick={handleDelete}>
            삭제
          </ModalButton>
          <div className="flex gap-2">
            <ModalButton variant="secondary" onClick={onClose}>
              취소
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" variant="white" />
                  저장 중...
                </span>
              ) : (
                '저장'
              )}
            </ModalButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 노드 타입 표시 */}
        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: nodeTypeInfo.color }}>{nodeTypeInfo.icon}</span>
          <span className="text-[var(--text-muted)]">{nodeTypeInfo.label}</span>
        </div>

        {/* 요약 */}
        <div>
          <label
            htmlFor={summaryInputId}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            요약 (노드에 표시됨)
          </label>
          <input
            id={summaryInputId}
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="자동 생성됩니다..."
            className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* 내용 */}
        <div>
          <label
            htmlFor={contentTextareaId}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            내용
          </label>
          <textarea
            id={contentTextareaId}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지 내용을 입력하세요..."
            className="w-full h-64 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none font-mono text-sm"
          />
        </div>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)] p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-md)]">
          {node.model && (
            <span>
              <span className="text-[var(--text-secondary)]">모델:</span> {node.model}
            </span>
          )}
          {node.tokenCount && (
            <span>
              <span className="text-[var(--text-secondary)]">토큰:</span> {node.tokenCount.toLocaleString()}
            </span>
          )}
          <span>
            <span className="text-[var(--text-secondary)]">생성:</span> {new Date(node.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </Modal>
  );
}
