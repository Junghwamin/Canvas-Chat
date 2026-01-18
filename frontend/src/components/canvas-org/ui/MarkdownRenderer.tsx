import { useEffect, useRef, memo, useState } from 'react';
import type { ReactNode } from 'react';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';

// 언어 등록
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

interface MarkdownRendererProps {
    content: string;
}

// 코드 블록 컴포넌트
const CodeBlock = memo(({ code, language }: { code: string; language: string }) => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const highlightCode = async () => {
            if (codeRef.current) {
                try {
                    const result = hljs.highlight(code, {
                        language: language || 'plaintext',
                        ignoreIllegals: true
                    });
                    // DOMPurify를 동적으로 로드하여 XSS 방지 (SSR 호환)
                    if (typeof window !== 'undefined') {
                        const DOMPurify = (await import('dompurify')).default;
                        codeRef.current.innerHTML = DOMPurify.sanitize(result.value);
                    } else {
                        codeRef.current.textContent = code;
                    }
                } catch {
                    // 언어를 찾을 수 없으면 일반 텍스트로 표시
                    codeRef.current.textContent = code;
                }
            }
        };
        highlightCode();
    }, [code, language]);

    const displayLanguage = language?.toUpperCase() || 'CODE';

    return (
        <div className="my-3 rounded-lg overflow-hidden border border-[#30363d]">
            {/* 코드 헤더 */}
            <div className="flex justify-between items-center px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                <span className="text-xs font-semibold text-cyan-400">{displayLanguage}</span>
                <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                >
                    📋 복사
                </button>
            </div>
            {/* 코드 본문 */}
            <pre className="bg-[#0d1117] p-4 overflow-x-auto">
                <code ref={codeRef} className="text-sm font-mono leading-relaxed text-gray-200">
                    {code}
                </code>
            </pre>
        </div>
    );
});

CodeBlock.displayName = 'CodeBlock';

// 마크다운 파싱 및 렌더링
const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
    // 코드 블록 추출 및 변환
    const renderContent = (): ReactNode[] => {
        const parts: ReactNode[] = [];
        let lastIndex = 0;
        let keyIndex = 0;

        // 코드 블록 패턴 (```language ... ```)
        const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            // 코드 블록 이전 텍스트
            if (match.index > lastIndex) {
                const textBefore = content.slice(lastIndex, match.index);
                parts.push(
                    <span key={keyIndex++} className="markdown-text">
                        {renderInlineElements(textBefore)}
                    </span>
                );
            }

            // 코드 블록
            const language = match[1] || 'text';
            const code = match[2].trim();
            parts.push(<CodeBlock key={keyIndex++} code={code} language={language} />);

            lastIndex = match.index + match[0].length;
        }

        // 남은 텍스트
        if (lastIndex < content.length) {
            const remainingText = content.slice(lastIndex);
            parts.push(
                <span key={keyIndex++} className="markdown-text">
                    {renderInlineElements(remainingText)}
                </span>
            );
        }

        return parts.length > 0 ? parts : [<span key="default">{content}</span>];
    };

    // 인라인 요소 렌더링 (볼드, 이탤릭, 인라인 코드 등)
    const renderInlineElements = (text: string): ReactNode[] => {
        // 간단한 줄바꿈 처리
        const lines = text.split('\n');

        return lines.map((line, lineIndex) => {
            // 헤딩 처리
            if (line.startsWith('### ')) {
                return <h3 key={lineIndex} className="text-lg font-semibold text-white mt-3 mb-1">{line.slice(4)}</h3>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={lineIndex} className="text-xl font-semibold text-white mt-4 mb-2">{line.slice(3)}</h2>;
            }
            if (line.startsWith('# ')) {
                return <h1 key={lineIndex} className="text-2xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>;
            }

            // 리스트 아이템 처리
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                    <div key={lineIndex} className="flex items-start gap-2 ml-2">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{renderInlineText(line.slice(2))}</span>
                    </div>
                );
            }

            // 숫자 리스트
            const numberedMatch = line.match(/^(\d+)\.\s/);
            if (numberedMatch) {
                return (
                    <div key={lineIndex} className="flex items-start gap-2 ml-2">
                        <span className="text-cyan-400 font-mono text-sm">{numberedMatch[1]}.</span>
                        <span>{renderInlineText(line.slice(numberedMatch[0].length))}</span>
                    </div>
                );
            }

            // 빈 줄
            if (line.trim() === '') {
                return <div key={lineIndex} className="h-2" />;
            }

            // 일반 텍스트
            return <p key={lineIndex} className="leading-relaxed">{renderInlineText(line)}</p>;
        });
    };

    // 인라인 텍스트 포맷팅
    const renderInlineText = (text: string): ReactNode[] => {
        const result: ReactNode[] = [];
        let keyIndex = 0;

        // 인라인 코드 (`code`)
        const inlineCodeRegex = /`([^`]+)`/g;
        let match;
        let lastIndex = 0;

        while ((match = inlineCodeRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                result.push(<span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>);
            }
            result.push(
                <code key={keyIndex++} className="inline-code bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono">
                    {match[1]}
                </code>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            const rest = text.slice(lastIndex);
            // 볼드 처리 (**text**)
            const boldParts = rest.split(/\*\*(.+?)\*\*/g);
            boldParts.forEach((part, i) => {
                if (i % 2 === 1) {
                    result.push(<strong key={keyIndex++} className="font-semibold text-white">{part}</strong>);
                } else if (part) {
                    result.push(<span key={keyIndex++}>{part}</span>);
                }
            });
        }

        return result.length > 0 ? result : [<span key="text">{text}</span>];
    };

    return (
        <div className="markdown-content text-sm text-gray-200">
            {renderContent()}
        </div>
    );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
