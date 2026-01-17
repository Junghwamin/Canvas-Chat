import { useState } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ChatNode } from '../../../types';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { currentCanvas, nodes } = useCanvasStore();
  const [format, setFormat] = useState<'json' | 'markdown'>('json');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

  if (!currentCanvas) return null;

  // 루트 노드들 찾기
  const rootNodes = nodes.filter((n) => !n.parentId);

  // 특정 노드부터 하위 트리 가져오기
  const getSubtree = (nodeId: string): ChatNode[] => {
    const result: ChatNode[] = [];
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return result;

    result.push(node);
    const children = nodes.filter((n) => n.parentId === nodeId);
    for (const child of children) {
      result.push(...getSubtree(child.id));
    }
    return result;
  };

  // JSON 형식으로 변환
  const toJSON = () => {
    const exportNodes = selectedBranch ? getSubtree(selectedBranch) : nodes;
    const data = {
      canvas: {
        id: currentCanvas.id,
        name: currentCanvas.name,
        systemPrompt: currentCanvas.systemPrompt,
        createdAt: currentCanvas.createdAt,
        updatedAt: currentCanvas.updatedAt,
      },
      nodes: exportNodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        type: n.type,
        content: n.content,
        summary: n.summary,
        model: n.model,
        tokenCount: n.tokenCount,
        createdAt: n.createdAt,
      })),
    };
    return JSON.stringify(data, null, 2);
  };

  // Markdown 형식으로 변환
  const toMarkdown = () => {
    const exportNodes = selectedBranch ? getSubtree(selectedBranch) : nodes;

    // 트리를 선형화 (깊이 우선)
    const linearize = (nodeId: string | null, depth: number = 0): string[] => {
      const result: string[] = [];
      const children = exportNodes.filter((n) => n.parentId === nodeId);

      for (const child of children) {
        const indent = '  '.repeat(depth);
        const icon = child.type === 'user' ? '👤 User' : `🤖 ${child.model || 'AI'}`;
        result.push(`${indent}### ${icon}\n`);
        result.push(`${indent}${child.content}\n`);
        result.push('');
        result.push(...linearize(child.id, depth));
      }

      return result;
    };

    const lines: string[] = [
      `# ${currentCanvas.name}`,
      '',
      `> 생성일: ${new Date(currentCanvas.createdAt).toLocaleString()}`,
      '',
    ];

    if (currentCanvas.systemPrompt) {
      lines.push('## System Prompt');
      lines.push('');
      lines.push(currentCanvas.systemPrompt);
      lines.push('');
    }

    lines.push('## Conversation');
    lines.push('');
    lines.push(...linearize(selectedBranch));

    return lines.join('\n');
  };

  const handleExport = () => {
    const content = format === 'json' ? toJSON() : toMarkdown();
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCanvas.name}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">📤 내보내기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4">
          {/* 형식 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              형식
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('json')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  format === 'json'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setFormat('markdown')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  format === 'markdown'
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Markdown
              </button>
            </div>
          </div>

          {/* 브랜치 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              범위
            </label>
            <select
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(e.target.value || null)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              <option value="">전체 캔버스</option>
              {rootNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.summary || node.content.substring(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          {/* 미리보기 정보 */}
          <div className="p-3 bg-gray-700/50 rounded-lg text-sm text-gray-300">
            <div>캔버스: {currentCanvas.name}</div>
            <div>
              노드 수: {selectedBranch ? getSubtree(selectedBranch).length : nodes.length}개
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
          >
            다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
