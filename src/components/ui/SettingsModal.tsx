import { useState, useEffect } from 'react';
import { useCanvasStore } from '../../stores/canvasStore';
import type { ModelType } from '../../types';
import { MODELS } from '../../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-gray-800 rounded-lg shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">⚙️ 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* API 키 섹션 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">API 키</h3>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Google AI API Key
              </label>
              <input
                type="password"
                value={googleKey}
                onChange={(e) => setGoogleKey(e.target.value)}
                placeholder="AI..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* 기본 모델 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              기본 모델
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value as ModelType)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-pink-500"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                시스템 프롬프트 (현재 캔버스)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="AI의 역할과 행동 방식을 정의하세요..."
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 resize-none text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                이 프롬프트는 모든 대화의 맨 앞에 추가됩니다.
              </p>
            </div>
          )}

          {/* 모델 정보 */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">모델 정보</h3>
            <div className="space-y-2">
              {MODELS.map((model) => (
                <div
                  key={model.id}
                  className="p-2 bg-gray-700/50 rounded text-xs text-gray-300"
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-gray-400">
                    최대 {(model.maxTokens / 1000).toFixed(0)}K 토큰 |
                    입력 ${model.inputPrice}/1M | 출력 ${model.outputPrice}/1M
                  </div>
                </div>
              ))}
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
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
