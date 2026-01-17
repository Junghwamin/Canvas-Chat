import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-8 sm:px-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-zinc-50 mb-4">
            RAG Document Q&A
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            문서 기반 AI 질의응답 서비스 - PDF, Word, 텍스트 파일을 업로드하고 자연어로 질문하세요.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-8">
          {/* RAG Q&A Card */}
          <Link
            href="/documents"
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-8 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:shadow-xl"
          >
            <div className="relative z-10">
              <div className="text-4xl mb-4">📄</div>
              <h2 className="text-2xl font-semibold mb-3 text-black dark:text-zinc-50">
                문서 Q&A
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                문서를 업로드하고 AI에게 질문하세요. RAG 기반으로 정확한 답변과 출처를 제공합니다.
              </p>
              <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-500">
                <li>✓ PDF, Word, 텍스트 지원</li>
                <li>✓ 출처 표시 및 추적</li>
                <li>✓ 대화 히스토리 관리</li>
              </ul>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-black dark:text-zinc-50 group-hover:gap-3 transition-all">
                시작하기 <span>→</span>
              </div>
            </div>
          </Link>

          {/* Canvas Chat Card */}
          <Link
            href="/canvas"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 dark:from-cyan-500/5 dark:to-violet-500/5 p-8 border border-cyan-200 dark:border-cyan-900 hover:border-cyan-300 dark:hover:border-cyan-800 transition-all hover:shadow-xl"
          >
            <div className="relative z-10">
              <div className="text-4xl mb-4">🎨</div>
              <h2 className="text-2xl font-semibold mb-3 text-black dark:text-zinc-50">
                Canvas Chat
                <span className="ml-2 text-xs font-normal px-2 py-1 rounded-full bg-cyan-500 text-white">NEW</span>
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                무한 캔버스에서 비선형적 대화를 진행하세요. 복잡한 주제를 체계적으로 탐구할 수 있습니다.
              </p>
              <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-500">
                <li>✓ 무한 캔버스 기반 UI</li>
                <li>✓ 멀티 LLM 지원 (GPT, Gemini)</li>
                <li>✓ 마인드맵식 대화 구조</li>
              </ul>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 group-hover:gap-3 transition-all">
                체험하기 <span>→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Info Section */}
        <div className="w-full max-w-4xl mt-8 p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold text-lg mb-3 text-black dark:text-zinc-50">기술 스택</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">Backend</div>
              <div className="text-zinc-600 dark:text-zinc-400">FastAPI, LangChain</div>
            </div>
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">Frontend</div>
              <div className="text-zinc-600 dark:text-zinc-400">Next.js 14, React</div>
            </div>
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">AI</div>
              <div className="text-zinc-600 dark:text-zinc-400">OpenAI GPT-4o</div>
            </div>
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">Vector DB</div>
              <div className="text-zinc-600 dark:text-zinc-400">ChromaDB</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
