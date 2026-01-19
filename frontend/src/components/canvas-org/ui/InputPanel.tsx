import { useState, useRef, useCallback, useId } from 'react';
import type { DragEvent } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ModelType, Message } from '../../../types';
import { MODELS } from '../../../types';
import { streamChat, streamChatWithImages, generateSummary, estimateTokens, truncateText, limitContextSize } from '../../../services/llmService';
import { processAndSaveAttachment, formatFileSize, getFileType, imageToBase64, readTextFile, extractPdfText } from '../../../services/fileService';
import { splitByHeadings, calculateSplitNodePositions, SPLIT_MODE_PROMPT } from '../../../services/splitResponseService';
import Spinner from '../../ui/Spinner';

interface InputPanelProps {
  onAddNode?: (parentId: string) => void;
  onAddRootNode?: () => void;
}

interface FilePreview {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'text' | 'code';
}

// SVG Icons
const Icons = {
  attach: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M14.5 9.5l-5.5 5.5a4 4 0 01-5.66-5.66l7-7a2.5 2.5 0 013.54 3.54l-6.5 6.5a1 1 0 01-1.42-1.42l5-5" />
    </svg>
  ),
  split: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M9 2v6M9 14v2M5 8l4 4 4-4" />
      <circle cx="4" cy="14" r="2" />
      <circle cx="14" cy="14" r="2" />
    </svg>
  ),
  send: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 2L8 10M16 2l-5 14-3-6-6-3 14-5z" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" />
    </svg>
  ),
  pdf: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5l-4-4H4zm5 0v4h4" />
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 4L1 8l4 4M11 4l4 4-4 4M9 2l-2 12" />
    </svg>
  ),
  text: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M2 3h12M2 7h8M2 11h10M2 15h6" />
    </svg>
  ),
};

export default function InputPanel(_props: InputPanelProps) {
  const {
    currentCanvas,
    selectedNodeId,
    nodes,
    currentModel,
    setCurrentModel,
    settings,
    addNode,
    updateNode,
    updateCanvas,
    getPathToRoot,
    isGenerating,
    setGenerating,
    setError,
  } = useCanvasStore();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();
  const modelSelectId = useId();

  // 파일 추가 처리
  const addFiles = useCallback(async (files: File[]) => {
    const newAttachments: FilePreview[] = [];

    for (const file of files) {
      const type = getFileType(file);
      let preview: string | undefined;

      if (type === 'image') {
        preview = await imageToBase64(file);
      }

      newAttachments.push({ file, preview, type });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || !currentCanvas || isGenerating) return;

    const messageContent = input.trim();
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setGenerating(true);

    try {
      // 사용자 노드 추가
      const parentId = selectedNodeId;
      const parentNode = parentId ? nodes.find((n) => n.id === parentId) : null;

      // 새 위치 계산
      const siblings = nodes.filter((n) => n.parentId === parentId);
      const position = parentNode
        ? {
          x: parentNode.position.x + siblings.length * 250,
          y: parentNode.position.y + 150,
        }
        : { x: 400, y: 100 };

      // 첨부파일 텍스트 추출 (병렬 처리로 성능 최적화)
      const imageAttachments: { base64: string; mimeType: string }[] = [];

      // 병렬로 모든 첨부파일 처리
      const attachmentResults = await Promise.all(
        currentAttachments.map(async (attachment) => {
          if (attachment.type === 'image') {
            const base64 = attachment.preview?.split(',')[1] || '';
            imageAttachments.push({
              base64,
              mimeType: attachment.file.type,
            });
            return '';
          } else if (attachment.type === 'pdf') {
            let pdfText = await extractPdfText(attachment.file);
            pdfText = truncateText(pdfText); // 토큰 제한 적용
            return pdfText ? `\n\n[PDF: ${attachment.file.name}]\n${pdfText}` : '';
          } else if (attachment.type === 'text' || attachment.type === 'code') {
            let text = await readTextFile(attachment.file);
            text = truncateText(text); // 토큰 제한 적용
            return `\n\n[${attachment.file.name}]\n\`\`\`\n${text}\n\`\`\``;
          }
          return '';
        })
      );

      const attachmentContent = attachmentResults.join('');

      const fullUserContent = messageContent + attachmentContent;

      // 사용자 메시지 노드 생성
      const userNode = await addNode({
        canvasId: currentCanvas.id,
        parentId,
        type: 'user',
        content: fullUserContent,
        summary: await generateSummary(messageContent || '(파일 첨부)', {
          openai: settings.openaiKey,
          google: settings.googleKey,
        }),
        isCompressed: false,
        tokenCount: estimateTokens(fullUserContent),
        attachments: [],
        position,
      });

      // 첨부파일 저장
      const savedAttachmentIds: string[] = [];
      for (const attachment of currentAttachments) {
        const saved = await processAndSaveAttachment(attachment.file, userNode.id);
        savedAttachmentIds.push(saved.id);
      }

      // 노드에 첨부파일 ID 업데이트
      if (savedAttachmentIds.length > 0) {
        await updateNode(userNode.id, { attachments: savedAttachmentIds });
      }

      // 맥락 구성 (스마트 컨텍스트 관리)
      const path = await getPathToRoot(userNode.id);
      const rawMessages: Message[] = [];

      // 시스템 프롬프트
      let systemPromptContent = currentCanvas.systemPrompt || '';
      if (currentCanvas.splitMode) {
        systemPromptContent += SPLIT_MODE_PROMPT;
      }
      if (systemPromptContent) {
        rawMessages.push({ role: 'system', content: systemPromptContent });
      }

      // 경로의 메시지들 (압축된 내용이나 요약 사용 우선)
      for (const node of path) {
        if (node.type === 'system') continue;

        // 너무 옛날 메시지는 summary만 사용하거나 compressedContent 사용
        const content = node.isCompressed && node.compressedContent
          ? node.compressedContent
          : node.content;

        rawMessages.push({
          role: node.type === 'user' ? 'user' : 'assistant',
          content,
        });
      }

      // 토큰 한도 내에서 메시지 구성
      const messages = limitContextSize(rawMessages);

      // AI 응답 노드 생성 (빈 상태로)
      const aiNode = await addNode({
        canvasId: currentCanvas.id,
        parentId: userNode.id,
        type: 'assistant',
        content: '',
        summary: '',
        isCompressed: false,
        model: currentModel,
        position: {
          x: userNode.position.x,
          y: userNode.position.y + 150,
        },
      });

      // 스트리밍 응답 받기
      let fullContent = '';
      const stream = imageAttachments.length > 0
        ? streamChatWithImages(messages, currentModel, {
          openai: settings.openaiKey,
          google: settings.googleKey,
        }, imageAttachments)
        : streamChat(messages, currentModel, {
          openai: settings.openaiKey,
          google: settings.googleKey,
        });

      for await (const chunk of stream) {
        fullContent += chunk;
        await updateNode(aiNode.id, { content: fullContent });
      }

      // 분할 모드 처리
      if (currentCanvas.splitMode) {
        const sections = splitByHeadings(fullContent);

        if (sections.length > 1) {
          // 원본 AI 노드를 요약 노드로 변환
          const summaryText = sections.map(s => `• ${s.title}`).join('\n');
          await updateNode(aiNode.id, {
            content: `이 응답은 ${sections.length}개 주제로 분할되었습니다:\n\n${summaryText}`,
            summary: '응답 분기점',
            tokenCount: estimateTokens(summaryText),
          });

          // 각 섹션별 노드 생성
          const positions = calculateSplitNodePositions(
            aiNode.position,
            sections.length
          );

          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            await addNode({
              canvasId: currentCanvas.id,
              parentId: aiNode.id,
              type: 'assistant',
              content: section.content,
              summary: section.title,
              isCompressed: false,
              model: currentModel,
              tokenCount: estimateTokens(section.content),
              position: positions[i],
            });
          }
        } else {
          // 분할할 섹션이 없으면 일반 응답으로 처리
          await updateNode(aiNode.id, {
            content: fullContent,
            summary: await generateSummary(fullContent, {
              openai: settings.openaiKey,
              google: settings.googleKey,
            }),
            tokenCount: estimateTokens(fullContent),
          });
        }
      } else {
        // 일반 모드: 기존 동작
        await updateNode(aiNode.id, {
          content: fullContent,
          summary: await generateSummary(fullContent, {
            openai: settings.openaiKey,
            google: settings.googleKey,
          }),
          tokenCount: estimateTokens(fullContent),
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '응답 생성 중 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  }, [
    input,
    attachments,
    currentCanvas,
    selectedNodeId,
    nodes,
    currentModel,
    settings,
    addNode,
    updateNode,
    getPathToRoot,
    isGenerating,
    setGenerating,
    setError,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (!currentCanvas) return null;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--bg-base)] to-transparent ${isDragging ? 'ring-2 ring-[var(--accent-primary)] ring-inset' : ''
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="메시지 입력 영역"
    >
      <div className="max-w-4xl mx-auto">
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 bg-[var(--accent-primary)]/30 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-[var(--radius-lg)]">
            <div className="text-[var(--text-primary)] text-lg font-medium flex items-center gap-2">
              {Icons.attach}
              파일을 여기에 놓으세요
            </div>
          </div>
        )}

        {/* 첨부파일 미리보기 */}
        {attachments.length > 0 && (
          <div
            className="flex flex-wrap gap-2 mb-2 p-2 bg-[var(--bg-elevated)] rounded-t-[var(--radius-lg)] border border-[var(--border-default)] border-b-0"
            role="list"
            aria-label="첨부 파일 목록"
          >
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group"
                role="listitem"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative w-16 h-16">
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-full h-full object-cover rounded-[var(--radius-md)]"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-danger)] rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`${attachment.file.name} 제거`}
                    >
                      {Icons.close}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--bg-hover)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]">
                    <span className="text-[var(--accent-primary)]">
                      {attachment.type === 'pdf' ? Icons.pdf : attachment.type === 'code' ? Icons.code : Icons.text}
                    </span>
                    <span className="max-w-24 truncate">{attachment.file.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({formatFileSize(attachment.file.size)})
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-[var(--text-muted)] hover:text-[var(--accent-danger)] ml-1 transition-colors"
                      aria-label={`${attachment.file.name} 제거`}
                    >
                      {Icons.close}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 선택된 노드 표시 */}
        {selectedNodeId && (
          <div
            className="mb-2 px-3 py-1.5 bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 rounded-[var(--radius-md)] text-sm text-[var(--accent-primary)]"
            role="status"
          >
            선택된 노드에서 분기합니다
          </div>
        )}

        <div className="flex gap-2">
          {/* 모델 선택 */}
          <div className="relative">
            <label htmlFor={modelSelectId} className="sr-only">AI 모델 선택</label>
            <select
              id={modelSelectId}
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value as ModelType)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
              aria-label="AI 모델 선택"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* 분할 모드 토글 */}
          <button
            onClick={() => updateCanvas(currentCanvas.id, { splitMode: !currentCanvas.splitMode })}
            className={`px-3 py-2 border rounded-[var(--radius-md)] text-sm transition-colors flex items-center gap-1.5 ${currentCanvas.splitMode
              ? 'bg-[var(--accent-secondary)] border-[var(--accent-secondary)] text-white'
              : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }`}
            aria-label={`응답 분할 모드 ${currentCanvas.splitMode ? '켜짐' : '꺼짐'}`}
            aria-pressed={currentCanvas.splitMode}
            title="응답을 주제별 노드로 분할 (## 헤딩 기준)"
          >
            {Icons.split}
            <span className="hidden sm:inline">분할</span>
          </button>

          {/* 파일 첨부 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="파일 첨부 (이미지, PDF, 텍스트)"
          >
            {Icons.attach}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.json,.xml,.yaml,.yml"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />

          {/* 입력창 */}
          <div className="flex-1 relative">
            <label htmlFor={textareaId} className="sr-only">메시지 입력</label>
            <textarea
              id={textareaId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedNodeId
                  ? '선택된 노드에서 새 질문을 입력하세요...'
                  : '질문을 입력하세요... (파일을 드래그하여 첨부 가능)'
              }
              className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none transition-colors"
              rows={1}
              disabled={isGenerating}
              aria-describedby={selectedNodeId ? 'selected-node-info' : undefined}
            />
          </div>

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={((!input.trim() && attachments.length === 0) || isGenerating)}
            className={`px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors flex items-center gap-2 ${isGenerating
              ? 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white'
              }`}
            aria-label={isGenerating ? '생성 중...' : '메시지 전송'}
            aria-busy={isGenerating}
          >
            {isGenerating ? (
              <Spinner size="sm" variant="white" label="생성 중" />
            ) : (
              <>
                {Icons.send}
                <span className="hidden sm:inline">전송</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
