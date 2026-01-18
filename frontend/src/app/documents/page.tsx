'use client';

import { useState, useRef, useEffect, useId, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Spinner from '../../components/ui/Spinner';
import { parseStatistics, isValidStatistics, type ParsedStatistics } from '../../utils/statisticsParser';
import StatisticsPanel from '../../components/documents/StatisticsPanel';
import ChartModal from '../../components/documents/ChartModal';

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

// SVG Icons
const Icons = {
    upload: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M3 12v3a2 2 0 002 2h8a2 2 0 002-2v-3M9 3v10M5 7l4-4 4 4" />
        </svg>
    ),
    trash: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M2 4h12M5.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1M13 4v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4" />
        </svg>
    ),
    send: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 2L8 10M16 2l-5 14-3-6-6-3 14-5z" />
        </svg>
    ),
    close: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
    ),
    home: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 6l6-4 6 4v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" />
            <path d="M6 15V9h4v6" />
        </svg>
    ),
    document: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5l-4-4z" />
            <path d="M9 1v4h4" />
        </svg>
    ),
    menu: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
    ),
    user: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="4.5" r="3" />
            <path d="M2 14a6 6 0 0112 0" />
        </svg>
    ),
    assistant: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <rect x="2" y="2" width="12" height="9" rx="2" />
            <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
            <circle cx="10.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
    ),
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [chartModalOpen, setChartModalOpen] = useState(false);
    const [selectedStats, setSelectedStats] = useState<ParsedStatistics | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputId = useId();

    // 메시지별 통계 데이터 파싱 (memoized)
    const messageStats = useMemo(() => {
        const statsMap = new Map<number, ParsedStatistics>();
        messages.forEach((msg, idx) => {
            if (msg.role === 'assistant') {
                const stats = parseStatistics(msg.content);
                if (isValidStatistics(stats)) {
                    statsMap.set(idx, stats!);
                }
            }
        });
        return statsMap;
    }, [messages]);

    const handleShowChart = (stats: ParsedStatistics) => {
        setSelectedStats(stats);
        setChartModalOpen(true);
    };

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

    const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        } catch {
            setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, []);

    const handleSend = useCallback(async () => {
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
                // Handle streaming text response (성능 최적화: chunks 배열 사용)
                const reader = res.body?.getReader();
                const decoder = new TextDecoder();
                const chunks: string[] = []; // O(n²) -> O(n) 최적화

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(decoder.decode(value, { stream: true })); // O(1)
                    }
                }

                const fullText = chunks.join(''); // O(n) 한 번만

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
    }, [input, isLoading, messages]);

    const handleDeleteDocument = useCallback(async (id: number) => {
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
    }, []);

    return (
        <div className="flex h-screen bg-[var(--bg-base)]">
            {/* Mobile menu button */}
            <button
                onClick={() => setIsSidebarOpen(true)}
                className="fixed top-4 left-4 z-40 md:hidden p-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)]"
                aria-label="메뉴 열기"
                aria-expanded={isSidebarOpen}
            >
                {Icons.menu}
            </button>

            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar - Documents List */}
            <aside
                className={`
                    fixed md:relative inset-y-0 left-0 z-50
                    w-72 h-full
                    bg-[var(--bg-surface)] border-r border-[var(--border-default)]
                    flex flex-col
                    transform transition-transform duration-[var(--transition-normal)]
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
                aria-label="문서 사이드바"
            >
                <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">문서 목록</h2>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        aria-label="사이드바 닫기"
                    >
                        {Icons.close}
                    </button>
                </div>

                {/* Upload Button */}
                <div className="p-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleUpload}
                        className="hidden"
                        aria-hidden="true"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full px-4 py-2.5 bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        aria-label="문서 업로드"
                    >
                        {isUploading ? (
                            <>
                                <Spinner size="sm" variant="white" />
                                업로드 중...
                            </>
                        ) : (
                            <>
                                {Icons.upload}
                                문서 업로드
                            </>
                        )}
                    </button>
                </div>

                {/* Documents */}
                <nav
                    className="flex-1 overflow-y-auto p-2"
                    role="navigation"
                    aria-label="문서 목록"
                >
                    {documents.length === 0 ? (
                        <div className="text-center text-[var(--text-muted)] text-sm py-8">
                            업로드된 문서가 없습니다.
                        </div>
                    ) : (
                        <ul className="space-y-2" role="list">
                            {documents.map((doc) => (
                                <li
                                    key={doc.id}
                                    className="p-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] rounded-[var(--radius-md)] group transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0 flex items-start gap-2">
                                            <span className="text-[var(--accent-primary)] mt-0.5">
                                                {Icons.document}
                                            </span>
                                            <div>
                                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                                                    {doc.filename}
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)]">
                                                    {doc.file_type} · {new Date(doc.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
                                            className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent-danger)] text-sm transition-all p-1 rounded-[var(--radius-sm)]"
                                            aria-label={`${doc.filename} 삭제`}
                                        >
                                            {Icons.trash}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>

                {/* Back Link */}
                <div className="p-4 border-t border-[var(--border-default)]">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {Icons.home}
                        홈으로
                    </Link>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border-default)] flex items-center px-6">
                    <div className="md:hidden w-10" /> {/* Spacer for mobile menu button */}
                    <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {Icons.document}
                        문서 Q&A
                    </h1>
                    <span className="ml-4 text-sm text-[var(--text-muted)]">
                        {documents.length}개 문서
                    </span>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6" role="log" aria-live="polite">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md">
                                <div className="text-6xl mb-4 text-[var(--accent-primary)]">
                                    {Icons.document}
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">RAG 문서 Q&A</h2>
                                <p className="text-[var(--text-muted)] mb-6">
                                    문서를 업로드하고 AI에게 질문하세요.<br />
                                    문서 내용을 기반으로 정확한 답변을 제공합니다.
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] transition-colors flex items-center gap-2 mx-auto"
                                >
                                    {Icons.upload}
                                    첫 문서 업로드하기
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
                                        className={`max-w-[80%] p-4 rounded-[var(--radius-lg)] ${msg.role === 'user'
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2 text-xs opacity-70">
                                            {msg.role === 'user' ? Icons.user : Icons.assistant}
                                            <span>{msg.role === 'user' ? '사용자' : 'AI'}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-white/20">
                                                <div className="text-xs opacity-70 mb-1">출처:</div>
                                                <div className="space-y-1">
                                                    {msg.sources.map((src, i) => (
                                                        <div key={i} className="text-xs opacity-80">
                                                            • {src.document} {src.page && `(p.${src.page})`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* 통계 데이터 감지 시 패널 표시 */}
                                        {messageStats.has(idx) && (
                                            <StatisticsPanel
                                                stats={messageStats.get(idx)!}
                                                onShowChart={() => handleShowChart(messageStats.get(idx)!)}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[var(--bg-surface)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] flex items-center gap-2">
                                        <Spinner size="sm" />
                                        <span className="text-[var(--text-muted)]">생각하는 중...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Error Toast */}
                {error && (
                    <div
                        role="alert"
                        className="mx-6 mb-2 p-3 bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 text-[var(--accent-danger)] rounded-[var(--radius-md)] text-sm flex justify-between items-center"
                    >
                        <span>{error}</span>
                        <button
                            onClick={() => setError(null)}
                            className="hover:opacity-70 p-1"
                            aria-label="오류 메시지 닫기"
                        >
                            {Icons.close}
                        </button>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <div className="max-w-3xl mx-auto flex gap-2">
                        <label htmlFor={inputId} className="sr-only">질문 입력</label>
                        <input
                            id={inputId}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={documents.length > 0 ? "문서에 대해 질문하세요..." : "먼저 문서를 업로드하세요..."}
                            disabled={documents.length === 0}
                            className="flex-1 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || documents.length === 0}
                            className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            aria-label="질문 전송"
                        >
                            {isLoading ? (
                                <Spinner size="sm" variant="white" />
                            ) : (
                                Icons.send
                            )}
                            <span className="hidden sm:inline">전송</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* 차트 모달 */}
            {selectedStats && (
                <ChartModal
                    isOpen={chartModalOpen}
                    onClose={() => {
                        setChartModalOpen(false);
                        setSelectedStats(null);
                    }}
                    stats={selectedStats}
                />
            )}
        </div>
    );
}
