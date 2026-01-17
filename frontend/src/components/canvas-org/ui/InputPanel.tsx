import { useState, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ModelType, Message } from '../../../types';
import { MODELS } from '../../../types';
import { streamChat, streamChatWithImages, generateSummary, estimateTokens } from '../../../services/llmService';
import { processAndSaveAttachment, formatFileSize, getFileType, imageToBase64, readTextFile, extractPdfText } from '../../../services/fileService';
import { splitByHeadings, calculateSplitNodePositions, SPLIT_MODE_PROMPT } from '../../../services/splitResponseService';

interface InputPanelProps {
  onAddNode?: (parentId: string) => void;
  onAddRootNode?: () => void;
}

interface FilePreview {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'text' | 'code';
}

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

      // 첨부파일 텍스트 추출
      let attachmentContent = '';
      const imageAttachments: { base64: string; mimeType: string }[] = [];

      for (const attachment of currentAttachments) {
        if (attachment.type === 'image') {
          const base64 = attachment.preview?.split(',')[1] || '';
          imageAttachments.push({
            base64,
            mimeType: attachment.file.type,
          });
        } else if (attachment.type === 'pdf') {
          const pdfText = await extractPdfText(attachment.file);
          if (pdfText) {
            attachmentContent += `\n\n[PDF: ${attachment.file.name}]\n${pdfText}`;
          }
        } else if (attachment.type === 'text' || attachment.type === 'code') {
          const text = await readTextFile(attachment.file);
          attachmentContent += `\n\n[${attachment.file.name}]\n\`\`\`\n${text}\n\`\`\``;
        }
      }

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

      // 맥락 구성
      const path = await getPathToRoot(userNode.id);
      const messages: Message[] = [];

      // 시스템 프롬프트 (분할 모드일 때 추가 지시사항 포함)
      let systemPromptContent = currentCanvas.systemPrompt || '';
      if (currentCanvas.splitMode) {
        systemPromptContent += SPLIT_MODE_PROMPT;
      }
      if (systemPromptContent) {
        messages.push({ role: 'system', content: systemPromptContent });
      }

      // 경로의 모든 메시지
      for (const node of path) {
        if (node.type === 'system') continue;
        messages.push({
          role: node.type === 'user' ? 'user' : 'assistant',
          content: node.isCompressed && node.compressedContent
            ? node.compressedContent
            : node.content,
        });
      }

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
      className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 to-transparent ${isDragging ? 'ring-2 ring-pink-500 ring-inset' : ''
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {/* 드래그 오버레이 */}
        {isDragging && (
          <div className="absolute inset-0 bg-pink-900/50 flex items-center justify-center pointer-events-none">
            <div className="text-white text-lg font-medium">
              파일을 여기에 놓으세요
            </div>
          </div>
        )}

        {/* 첨부파일 미리보기 */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-800 rounded-t-lg">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="relative group"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative w-16 h-16">
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-full h-full object-cover rounded"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-sm text-white">
                    <span>
                      {attachment.type === 'pdf' ? '📄' : attachment.type === 'code' ? '💻' : '📝'}
                    </span>
                    <span className="max-w-24 truncate">{attachment.file.name}</span>
                    <span className="text-xs text-gray-400">
                      ({formatFileSize(attachment.file.size)})
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 선택된 노드 표시 */}
        {selectedNodeId && (
          <div className="mb-2 px-3 py-1 bg-pink-900/50 rounded text-sm text-pink-300">
            선택된 노드에서 분기합니다
          </div>
        )}

        <div className="flex gap-2">
          {/* 모델 선택 */}
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value as ModelType)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>

          {/* 분할 모드 토글 */}
          <button
            onClick={() => updateCanvas(currentCanvas.id, { splitMode: !currentCanvas.splitMode })}
            className={`px-3 py-2 border rounded-lg text-sm transition-colors flex items-center gap-1 ${currentCanvas.splitMode
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
              }`}
            title="응답을 주제별 노드로 분할 (## 헤딩 기준)"
          >
            🌿 분할
          </button>

          {/* 파일 첨부 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors"
            title="파일 첨부 (이미지, PDF, 텍스트)"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.json,.xml,.yaml,.yml"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 입력창 */}
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedNodeId
                  ? '선택된 노드에서 새 질문을 입력하세요...'
                  : '질문을 입력하세요... (파일을 드래그하여 첨부 가능)'
              }
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 resize-none"
              rows={1}
              disabled={isGenerating}
            />
          </div>

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={((!input.trim() && attachments.length === 0) || isGenerating)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isGenerating
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-pink-600 hover:bg-pink-700 text-white'
              }`}
          >
            {isGenerating ? '⏳' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
