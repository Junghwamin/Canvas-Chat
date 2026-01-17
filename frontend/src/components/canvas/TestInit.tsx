'use client';

import { useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

// Test initialization component to set API key automatically for E2E testing
export default function TestInit() {
    const { updateSettings, settings } = useCanvasStore();

    useEffect(() => {
        const initTest = async () => {
            // Only set if not already configured
            if (!settings.openaiApiKey) {
                await updateSettings({
                    openaiApiKey: '', // API Key removed for security
                    defaultModel: 'gpt-4o-mini',
                    temperature: 0.7,
                });
                console.log('✅ Settings initialized (Key required)');
            }
        };

        initTest();
    }, []);

    return null;
}
