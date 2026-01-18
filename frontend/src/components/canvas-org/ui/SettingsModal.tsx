import { useState, useEffect, useId } from 'react';
import { useCanvasStore } from '../../../stores/canvasStore';
import type { ModelType } from '../../../types';
import { MODELS } from '../../../types';
import Modal, { ModalButton } from '../../ui/Modal';
import Spinner from '../../ui/Spinner';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, saveSettings, currentCanvas, updateCanvas } = useCanvasStore();

  const [openaiKey, setOpenaiKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [defaultModel, setDefaultModel] = useState<ModelType>('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Unique IDs for form fields
  const openaiKeyId = useId();
  const googleKeyId = useId();
  const defaultModelId = useId();
  const systemPromptId = useId();

  useEffect(() => {
    setOpenaiKey(settings.openaiKey || '');
    setGoogleKey(settings.googleKey || '');
    setDefaultModel((settings.defaultModel as ModelType) || 'gpt-4o-mini');
    setSystemPrompt(currentCanvas?.systemPrompt || '');
  }, [settings, currentCanvas]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        openaiKey: openaiKey.trim() || undefined,
        googleKey: googleKey.trim() || undefined,
        defaultModel,
      });

      if (currentCanvas) {
        await updateCanvas(currentCanvas.id, {
          systemPrompt: systemPrompt.trim(),
        });
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="설정"
      maxWidth="lg"
      footer={
        <>
          <ModalButton variant="secondary" onClick={onClose}>
            취소
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner size="sm" variant="white" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* API 키 섹션 */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            API 키
          </legend>

          <div>
            <label
              htmlFor={openaiKeyId}
              className="block text-xs text-[var(--text-muted)] mb-1"
            >
              OpenAI API Key
            </label>
            <input
              id={openaiKeyId}
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor={googleKeyId}
              className="block text-xs text-[var(--text-muted)] mb-1"
            >
              Google AI API Key
            </label>
            <input
              id={googleKeyId}
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AI..."
              className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm font-mono"
              autoComplete="off"
            />
          </div>
        </fieldset>

        {/* 기본 모델 선택 */}
        <div>
          <label
            htmlFor={defaultModelId}
            className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
          >
            기본 모델
          </label>
          <select
            id={defaultModelId}
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value as ModelType)}
            className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
        </div>

        {/* 시스템 프롬프트 */}
        {currentCanvas && (
          <div>
            <label
              htmlFor={systemPromptId}
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1"
            >
              시스템 프롬프트 (현재 캔버스)
            </label>
            <textarea
              id={systemPromptId}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="AI의 역할과 행동 방식을 정의하세요..."
              className="w-full h-32 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none text-sm"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              이 프롬프트는 모든 대화의 맨 앞에 추가됩니다.
            </p>
          </div>
        )}

        {/* 모델 정보 */}
        <div>
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            모델 정보
          </h3>
          <div className="space-y-2" role="list" aria-label="사용 가능한 모델 목록">
            {MODELS.map((model) => (
              <div
                key={model.id}
                className="p-2 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)]"
                role="listitem"
              >
                <div className="font-medium text-[var(--text-primary)]">
                  {model.name}
                </div>
                <div className="text-[var(--text-muted)]">
                  최대 {(model.maxTokens / 1000).toFixed(0)}K 토큰 |
                  입력 ${model.inputPrice}/1M | 출력 ${model.outputPrice}/1M
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
