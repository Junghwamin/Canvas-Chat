'use client';

import { useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { X } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
    const { settings, updateSettings } = useCanvasStore();

    const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey || '');
    const [googleKey, setGoogleKey] = useState(settings.googleApiKey || '');
    const [defaultModel, setDefaultModel] = useState(settings.defaultModel || 'gpt-4o-mini');
    const [temperature, setTemperature] = useState(settings.temperature || 0.7);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        await updateSettings({
            openaiApiKey: openaiKey,
            googleApiKey: googleKey,
            defaultModel,
            temperature,
        });
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-secondary)] rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--bg-tertiary)]">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">설정</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* OpenAI API Key */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                            GPT 모델을 사용하려면 OpenAI API 키가 필요합니다.
                        </p>
                    </div>

                    {/* Google API Key */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Google API Key (선택)
                        </label>
                        <input
                            type="password"
                            value={googleKey}
                            onChange={(e) => setGoogleKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Gemini 모델을 사용하려면 Google API 키가 필요합니다.
                        </p>
                    </div>

                    {/* Default Model */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            기본 모델
                        </label>
                        <select
                            value={defaultModel}
                            onChange={(e) => setDefaultModel(e.target.value)}
                            className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                            <optgroup label="OpenAI">
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (추천)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            </optgroup>
                            <optgroup label="Google">
                                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Temperature */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Temperature: {temperature.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                            <span>정확함 (0.0)</span>
                            <span>창의적 (2.0)</span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="glass rounded-lg p-4">
                        <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-2">
                            🔒 개인정보 보호
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)]">
                            API 키는 브라우저의 IndexedDB에만 저장되며, 서버로 전송되지 않습니다.
                            모든 대화 내용도 로컬에만 저장됩니다.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-[var(--bg-tertiary)]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-opacity-80 transition-colors"
                    >
                        {saved ? '✓ 저장됨' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
