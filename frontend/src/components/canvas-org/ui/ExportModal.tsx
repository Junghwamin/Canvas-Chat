import { useState, useId, useRef } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ChatNode } from '../../../types';
import Modal, { ModalButton } from '../../ui/Modal';
import { generateConversationSummary } from '../../../services/llmService';
import { Sparkles, Send, Loader2, FileText, Copy, Check } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const { currentCanvas, nodes, settings, currentModel } = useCanvasStore();
  const [format, setFormat] = useState<'json' | 'markdown' | 'ai-summary'>('json');
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const branchSelectId = useId();

  // AI 요약 관련 상태
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 문서 전송 관련 상태
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

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
        const icon = child.type === 'user' ? 'User' : `${child.model || 'AI'}`;
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

  // AI 요약 생성
  const generateAISummary = async () => {
    if (!settings.openaiKey && !settings.googleKey) {
      setSummaryError('API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
      return;
    }

    setIsSummarizing(true);
    setAiSummary('');
    setSummaryError(null);

    try {
      const markdown = toMarkdown();
      const apiKeys = {
        openai: settings.openaiKey,
        google: settings.googleKey,
      };

      const generator = generateConversationSummary(markdown, currentModel, apiKeys);

      for await (const chunk of generator) {
        setAiSummary((prev) => prev + chunk);
      }
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'AI 요약 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // 클립보드에 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiSummary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // 복사 실패 시 무시
    }
  };

  // 문서 Q&A로 전송
  const handleTransferToDocuments = async () => {
    setIsTransferring(true);
    setTransferSuccess(false);

    try {
      const content = format === 'ai-summary' && aiSummary ? aiSummary : toMarkdown();
      const filename = `${currentCanvas.name}${format === 'ai-summary' ? '-요약' : ''}.md`;

      const response = await fetch('http://localhost:8000/api/v1/documents/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          filename,
          source_type: 'canvas',
          metadata: {
            canvas_id: currentCanvas.id,
            canvas_name: currentCanvas.name,
            node_count: nodes.length,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('문서 전송에 실패했습니다.');
      }

      setTransferSuccess(true);
      setTimeout(() => setTransferSuccess(false), 3000);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : '문서 전송 중 오류가 발생했습니다.');
    } finally {
      setIsTransferring(false);
    }
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

  const exportNodeCount = selectedBranch ? getSubtree(selectedBranch).length : nodes.length;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="내보내기"
      maxWidth="md"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            취소
          </ModalButton>
          <ModalButton variant="primary" onClick={handleExport}>
            다운로드
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* 형식 선택 */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            형식
          </label>
          <div className="flex gap-2" role="group" aria-label="내보내기 형식 선택">
            <button
              onClick={() => setFormat('json')}
              className={`flex-1 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                format === 'json'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              aria-pressed={format === 'json'}
            >
              JSON
            </button>
            <button
              onClick={() => setFormat('markdown')}
              className={`flex-1 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors ${
                format === 'markdown'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              aria-pressed={format === 'markdown'}
            >
              Markdown
            </button>
            <button
              onClick={() => setFormat('ai-summary')}
              className={`flex-1 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors flex items-center justify-center gap-1 ${
                format === 'ai-summary'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
              aria-pressed={format === 'ai-summary'}
            >
              <Sparkles className="w-4 h-4" />
              AI 정리
            </button>
          </div>
        </div>

        {/* 브랜치 선택 */}
        <div>
          <label
            htmlFor={branchSelectId}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            범위
          </label>
          <select
            id={branchSelectId}
            value={selectedBranch || ''}
            onChange={(e) => setSelectedBranch(e.target.value || null)}
            className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
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
        <div
          className="p-3 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] text-sm text-[var(--text-secondary)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex justify-between">
            <span>캔버스:</span>
            <span className="text-[var(--text-primary)]">{currentCanvas.name}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>노드 수:</span>
            <span className="text-[var(--text-primary)]">{exportNodeCount}개</span>
          </div>
        </div>

        {/* AI 정리 섹션 */}
        {format === 'ai-summary' && (
          <div className="space-y-3">
            {!aiSummary && !isSummarizing && (
              <button
                onClick={generateAISummary}
                disabled={isSummarizing}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-[var(--radius-md)] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-5 h-5" />
                AI로 대화 정리하기
              </button>
            )}

            {isSummarizing && (
              <div className="p-4 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-default)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI가 대화를 분석하고 있습니다...</span>
                </div>
                {aiSummary && (
                  <div className="prose prose-sm max-h-60 overflow-y-auto text-[var(--text-primary)] whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                )}
              </div>
            )}

            {aiSummary && !isSummarizing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">AI 정리 결과</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-default)] max-h-60 overflow-y-auto">
                  <div className="prose prose-sm text-[var(--text-primary)] whitespace-pre-wrap">
                    {aiSummary}
                  </div>
                </div>
                <button
                  onClick={generateAISummary}
                  className="text-sm text-[var(--accent-primary)] hover:underline"
                >
                  다시 생성하기
                </button>
              </div>
            )}

            {summaryError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-[var(--radius-md)] text-red-400 text-sm">
                {summaryError}
              </div>
            )}
          </div>
        )}

        {/* 문서 Q&A로 전송 */}
        <div className="pt-2 border-t border-[var(--border-default)]">
          <button
            onClick={handleTransferToDocuments}
            disabled={isTransferring || (format === 'ai-summary' && !aiSummary)}
            className={`w-full px-4 py-2.5 rounded-[var(--radius-md)] flex items-center justify-center gap-2 transition-colors ${
              isTransferring || (format === 'ai-summary' && !aiSummary)
                ? 'bg-[var(--bg-elevated)] text-[var(--text-disabled)] cursor-not-allowed'
                : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]'
            }`}
          >
            {isTransferring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                전송 중...
              </>
            ) : transferSuccess ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">문서 Q&A에 추가됨!</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <Send className="w-4 h-4" />
                문서 Q&A로 전송
              </>
            )}
          </button>
          <p className="text-xs text-[var(--text-disabled)] mt-1.5 text-center">
            {format === 'ai-summary'
              ? 'AI 정리 결과를 문서 Q&A에서 검색할 수 있습니다'
              : 'Markdown 형식으로 문서 Q&A에서 검색할 수 있습니다'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
