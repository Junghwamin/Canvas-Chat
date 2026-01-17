import { useState, useEffect } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import { generateSummary } from '../../../services/llmService';

interface NodeEditModalProps {
  nodeId: string;
  onClose: () => void;
}

export default function NodeEditModal({ nodeId, onClose }: NodeEditModalProps) {
  const { nodes, updateNode, deleteNode, settings } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);

  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const getNodeTypeLabel = () => {
    switch (node.type) {
      case 'user':
        return '👤 사용자 메시지';
      case 'assistant':
        return '🤖 AI 응답';
      case 'system':
        return '⚙️ 시스템 프롬프트';
      default:
        return '💬 메시지';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{getNodeTypeLabel()}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* 요약 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              요약 (노드에 표시됨)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="자동 생성됩니다..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="메시지 내용을 입력하세요..."
              className="w-full h-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 resize-none font-mono text-sm"
            />
          </div>

          {/* 메타 정보 */}
          <div className="flex gap-4 text-sm text-gray-400">
            {node.model && <span>모델: {node.model}</span>}
            {node.tokenCount && <span>토큰: {node.tokenCount.toLocaleString()}</span>}
            <span>생성: {new Date(node.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-between px-4 py-3 border-t border-gray-700">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            삭제
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
