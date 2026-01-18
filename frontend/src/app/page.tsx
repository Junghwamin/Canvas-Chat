"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/15 via-cyan-500/15 to-blue-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-violet-500/10 to-cyan-500/10 blur-3xl" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main Content */}
      <main className={`relative z-10 flex min-h-screen flex-col items-center justify-center px-6 sm:px-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Header with Glow Effect */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-zinc-400">Powered by GPT-4o & LangChain</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              RAG Document
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Q&A Service
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            PDF, Word, Excel 문서를 업로드하고
            <span className="text-cyan-400 font-medium"> AI </span>
            에게 자연어로 질문하세요.
            <br />
            정확한 답변과
            <span className="text-violet-400 font-medium"> 출처 추적</span>
            을 경험하세요.
          </p>
        </div>

        {/* Feature Cards - Glassmorphism Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
          {/* RAG Q&A Card */}
          <Link
            href="/documents"
            className="group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
          >
            {/* Card Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-800/40 backdrop-blur-xl border border-zinc-700/50 rounded-3xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            {/* Glow Effect on Hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">📄</span>
              </div>

              <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-cyan-300 transition-colors">
                문서 Q&A
              </h2>

              <p className="text-zinc-400 mb-6 leading-relaxed">
                문서를 업로드하고 AI에게 질문하세요.
                <span className="text-cyan-400">RAG 기반</span>으로
                정확한 답변과 출처를 제공합니다.
              </p>

              <div className="space-y-3 mb-6">
                {['PDF, Word, Excel 지원', '출처 표시 및 추적', '대화 히스토리 관리'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-zinc-500">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 text-xs">✓</span>
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 text-cyan-400 font-medium group-hover:gap-4 transition-all">
                시작하기
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* Canvas Chat Card */}
          <Link
            href="/canvas"
            className="group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1"
          >
            {/* Card Background with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-zinc-900/60 to-fuchsia-900/20 backdrop-blur-xl border border-violet-500/30 rounded-3xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🎨</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white uppercase tracking-wider animate-pulse">
                  New
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-violet-300 transition-colors">
                Canvas Chat
              </h2>

              <p className="text-zinc-400 mb-6 leading-relaxed">
                <span className="text-violet-400">무한 캔버스</span>에서
                비선형적 대화를 진행하세요.
                복잡한 주제를 체계적으로 탐구할 수 있습니다.
              </p>

              <div className="space-y-3 mb-6">
                {['무한 캔버스 기반 UI', '멀티 LLM 지원 (GPT, Gemini)', '마인드맵식 대화 구조'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-zinc-500">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <span className="text-violet-400 text-xs">✓</span>
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 text-violet-400 font-medium group-hover:gap-4 transition-all">
                체험하기
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Tech Stack - Modern Pills */}
        <div className="w-full max-w-4xl">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'FastAPI', color: 'emerald' },
              { label: 'LangChain', color: 'cyan' },
              { label: 'Next.js 15', color: 'white' },
              { label: 'GPT-4o', color: 'violet' },
              { label: 'ChromaDB', color: 'fuchsia' },
              { label: 'React Flow', color: 'cyan' },
            ].map((tech, i) => (
              <span
                key={i}
                className={`px-4 py-2 rounded-full text-sm font-medium bg-zinc-800/50 border border-zinc-700/50 backdrop-blur-sm
                  ${tech.color === 'emerald' ? 'text-emerald-400' : ''}
                  ${tech.color === 'cyan' ? 'text-cyan-400' : ''}
                  ${tech.color === 'white' ? 'text-white' : ''}
                  ${tech.color === 'violet' ? 'text-violet-400' : ''}
                  ${tech.color === 'fuchsia' ? 'text-fuchsia-400' : ''}
                  hover:border-zinc-600 hover:bg-zinc-800 transition-all cursor-default
                `}
              >
                {tech.label}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-zinc-600 text-sm">
          <p>Built with ❤️ using modern AI stack</p>
        </div>
      </main>
    </div>
  );
}
