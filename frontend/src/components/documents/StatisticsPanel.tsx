'use client';

import { useState } from 'react';
import { BarChart3, FileSpreadsheet, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ParsedStatistics } from '../../utils/statisticsParser';
import { exportToExcel, exportToCSV, copyTableToClipboard, generateStatsSummary } from '../../services/exportService';

interface StatisticsPanelProps {
  stats: ParsedStatistics;
  onShowChart: () => void;
}

export default function StatisticsPanel({ stats, onShowChart }: StatisticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const handleExportExcel = () => {
    exportToExcel(stats, { filename: stats.title || '통계데이터' });
  };

  const handleExportCSV = () => {
    exportToCSV(stats, stats.title || '통계데이터');
  };

  const handleCopy = async () => {
    const success = await copyTableToClipboard(stats);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const summary = generateStatsSummary(stats);
  const total = stats.data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="mt-4 border border-purple-500/30 rounded-xl bg-purple-900/10 overflow-hidden">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-purple-900/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-purple-300">
              {stats.title || '통계 데이터 감지됨'}
            </h4>
            <p className="text-xs text-gray-400">
              {stats.data.length}개 항목 • {stats.type === 'percentage' ? '비율 데이터' : '수치 데이터'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {isExpanded ? '접기' : '펼치기'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* 확장된 내용 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 데이터 테이블 미리보기 */}
          <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-3 py-2 text-gray-400 font-medium">항목</th>
                  <th className="text-right px-3 py-2 text-gray-400 font-medium">값</th>
                  {stats.data.some(d => d.unit) && (
                    <th className="text-right px-3 py-2 text-gray-400 font-medium">단위</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.data.slice(0, 5).map((item, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="px-3 py-2 text-gray-300">{item.label}</td>
                    <td className="px-3 py-2 text-right text-white font-mono">
                      {item.value.toLocaleString()}
                    </td>
                    {stats.data.some(d => d.unit) && (
                      <td className="px-3 py-2 text-right text-gray-400">{item.unit || ''}</td>
                    )}
                  </tr>
                ))}
                {stats.data.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-center text-gray-500 text-xs">
                      + {stats.data.length - 5}개 더...
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-700/30">
                  <td className="px-3 py-2 text-gray-300 font-medium">합계</td>
                  <td className="px-3 py-2 text-right text-purple-400 font-mono font-medium">
                    {total.toLocaleString()}
                  </td>
                  {stats.data.some(d => d.unit) && (
                    <td className="px-3 py-2 text-right text-gray-400">{stats.data[0]?.unit || ''}</td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 요약 정보 */}
          {showSummary && (
            <pre className="p-3 bg-gray-800/50 rounded-lg text-xs text-gray-300 whitespace-pre-wrap">
              {summary}
            </pre>
          )}

          {/* 액션 버튼들 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onShowChart}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              차트 보기
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  복사
                </>
              )}
            </button>

            <button
              onClick={() => setShowSummary(!showSummary)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 transition-colors"
            >
              {showSummary ? '요약 숨기기' : '요약 보기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
