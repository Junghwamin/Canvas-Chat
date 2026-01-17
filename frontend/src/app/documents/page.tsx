'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Document {
    id: number;
    filename: string;
    file_type: string;
    created_at: string;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: { document: string; page?: number }[];
}

const API_BASE = 'http://localhost:8000/api/v1';

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Load documents on mount
    useEffect(() => {
        fetchDocuments();
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`${API_BASE}/documents/`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${API_BASE}/documents/upload`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                await fetchDocuments();
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `"${file.name}" 파일이 업로드되었습니다. 이제 이 문서에 대해 질문해보세요!`
                }]);
            } else {
                const err = await res.json();
                setError(err.detail || '파일 업로드에 실패했습니다.');
            }
        } catch (err) {
            setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message to state
        const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);
        setError(null);

        try {
            // Send conversation history for context-aware responses
            const chatHistory = newMessages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const res = await fetch(`${API_BASE}/chat/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: userMessage,
                    chat_history: chatHistory.slice(0, -1) // Exclude current question
                }),
            });

            if (res.ok) {
                // Handle streaming text response
                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                let fullText = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        fullText += decoder.decode(value, { stream: true });
                    }
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: fullText || '응답을 받지 못했습니다.',
                }]);
            } else {
                const errorText = await res.text();
                setError(errorText || '응답 생성에 실패했습니다.');
            }
        } catch (err) {
            console.error('Chat error:', err);
            setError('서버에 연결할 수 없습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDocument = async (id: number) => {
        if (!confirm('이 문서를 삭제하시겠습니까?')) return;

        try {
            const res = await fetch(`${API_BASE}/documents/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                await fetchDocuments();
            }
        } catch (err) {
            console.error('Failed to delete document:', err);
        }
    };

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-black">
            {/* Sidebar - Documents List */}
            <div className="w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold text-black dark:text-white">문서 목록</h2>
                </div>

                {/* Upload Button */}
                <div className="p-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <span className="animate-spin">⏳</span> 업로드 중...
                            </>
                        ) : (
                            <>📤 문서 업로드</>
                        )}
                    </button>
                </div>

                {/* Documents */}
                <div className="flex-1 overflow-y-auto p-2">
                    {documents.length === 0 ? (
                        <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm py-8">
                            업로드된 문서가 없습니다.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-black dark:text-white truncate">
                                                {doc.filename}
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {doc.file_type} · {new Date(doc.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 text-sm transition-opacity"
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Back Link */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                    >
                        ← 홈으로
                    </Link>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6">
                    <h1 className="text-xl font-bold text-black dark:text-white">📄 문서 Q&A</h1>
                    <span className="ml-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {documents.length}개 문서
                    </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="text-6xl mb-4">📚</div>
                                <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">RAG 문서 Q&A</h2>
                                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                                    문서를 업로드하고 AI에게 질문하세요.<br />
                                    문서 내용을 기반으로 정확한 답변을 제공합니다.
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    📤 첫 문서 업로드하기
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white dark:bg-zinc-800 text-black dark:text-white border border-zinc-200 dark:border-zinc-700'
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-zinc-300 dark:border-zinc-600">
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">📑 출처:</div>
                                                <div className="space-y-1">
                                                    {msg.sources.map((src, i) => (
                                                        <div key={i} className="text-xs text-zinc-600 dark:text-zinc-300">
                                                            • {src.document} {src.page && `(p.${src.page})`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                        <span className="animate-pulse">생각하는 중...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Error Toast */}
                {error && (
                    <div className="mx-6 mb-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="hover:opacity-70">✕</button>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="max-w-3xl mx-auto flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={documents.length > 0 ? "문서에 대해 질문하세요..." : "먼저 문서를 업로드하세요..."}
                            disabled={documents.length === 0}
                            className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || documents.length === 0}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '...' : '전송'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
