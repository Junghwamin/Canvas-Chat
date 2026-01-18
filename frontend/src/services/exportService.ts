// Excel 및 차트 내보내기 서비스
import * as XLSX from 'xlsx';
import type { ParsedStatistics, StatisticsData } from '../utils/statisticsParser';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeTitle?: boolean;
}

// Excel 파일로 내보내기
export function exportToExcel(stats: ParsedStatistics, options: ExportOptions = {}): void {
  const { filename = '통계데이터', sheetName = '통계', includeTitle = true } = options;

  // 데이터 준비
  const rows: (string | number)[][] = [];

  // 제목 추가
  if (includeTitle && stats.title) {
    rows.push([stats.title]);
    rows.push([]);
  }

  // 헤더
  const headers = ['항목', '값'];
  if (stats.data.some((d) => d.unit)) {
    headers.push('단위');
  }
  if (stats.data.some((d) => d.category)) {
    headers.push('카테고리');
  }
  rows.push(headers);

  // 데이터 행
  for (const item of stats.data) {
    const row: (string | number)[] = [item.label, item.value];
    if (stats.data.some((d) => d.unit)) {
      row.push(item.unit || '');
    }
    if (stats.data.some((d) => d.category)) {
      row.push(item.category || '');
    }
    rows.push(row);
  }

  // 합계 행 추가 (퍼센트가 아닌 경우)
  if (!stats.data.every((d) => d.unit === '%')) {
    const total = stats.data.reduce((sum, d) => sum + d.value, 0);
    const totalRow: (string | number)[] = ['합계', total];
    if (stats.data.some((d) => d.unit)) {
      totalRow.push(stats.data[0]?.unit || '');
    }
    rows.push([]);
    rows.push(totalRow);
  }

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 열 너비 설정
  const colWidths = [
    { wch: Math.max(...rows.map((r) => String(r[0] || '').length), 10) },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // 다운로드
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// CSV 파일로 내보내기
export function exportToCSV(stats: ParsedStatistics, filename: string = '통계데이터'): void {
  const rows: string[] = [];

  // 헤더
  const headers = ['항목', '값'];
  if (stats.data.some((d) => d.unit)) {
    headers.push('단위');
  }
  rows.push(headers.join(','));

  // 데이터 행
  for (const item of stats.data) {
    const row = [
      `"${item.label}"`,
      item.value.toString(),
      stats.data.some((d) => d.unit) ? `"${item.unit || ''}"` : '',
    ].filter(Boolean);
    rows.push(row.join(','));
  }

  // BOM 추가 (Excel에서 한글 인식)
  const bom = '\uFEFF';
  const csvContent = bom + rows.join('\n');

  // 다운로드
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// 차트 이미지로 내보내기 (html2canvas 사용)
export async function exportChartAsImage(
  chartElement: HTMLElement,
  filename: string = '차트',
  format: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(chartElement, {
    backgroundColor: '#1a1a2e',
    scale: 2, // 고해상도
  });

  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = canvas.toDataURL(`image/${format}`, 0.95);
  link.click();
}

// 차트 데이터를 Recharts 형식으로 변환
export function toRechartsData(stats: ParsedStatistics): { name: string; value: number; fill?: string }[] {
  const colors = [
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  return stats.data.map((item, index) => ({
    name: item.label,
    value: item.value,
    fill: colors[index % colors.length],
  }));
}

// 파이 차트용 데이터 변환 (총합 계산 포함)
export function toPieChartData(
  stats: ParsedStatistics
): { name: string; value: number; percent: number; fill: string }[] {
  const total = stats.data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

  return stats.data.map((item, index) => ({
    name: item.label,
    value: item.value,
    percent: total > 0 ? (item.value / total) * 100 : 0,
    fill: colors[index % colors.length],
  }));
}

// 클립보드에 테이블 복사
export async function copyTableToClipboard(stats: ParsedStatistics): Promise<boolean> {
  const rows: string[] = [];

  // 헤더
  rows.push('항목\t값' + (stats.data.some((d) => d.unit) ? '\t단위' : ''));

  // 데이터 행
  for (const item of stats.data) {
    let row = `${item.label}\t${item.value}`;
    if (stats.data.some((d) => d.unit)) {
      row += `\t${item.unit || ''}`;
    }
    rows.push(row);
  }

  try {
    await navigator.clipboard.writeText(rows.join('\n'));
    return true;
  } catch {
    return false;
  }
}

// 통계 요약 생성
export function generateStatsSummary(stats: ParsedStatistics): string {
  const values = stats.data.map((d) => d.value);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const maxItem = stats.data.find((d) => d.value === max);
  const minItem = stats.data.find((d) => d.value === min);

  const unit = stats.data[0]?.unit || '';

  return `
📊 통계 요약
━━━━━━━━━━━━━━━━━━
• 항목 수: ${stats.data.length}개
• 합계: ${total.toLocaleString()}${unit}
• 평균: ${avg.toFixed(1).toLocaleString()}${unit}
• 최대: ${maxItem?.label} (${max.toLocaleString()}${unit})
• 최소: ${minItem?.label} (${min.toLocaleString()}${unit})
`.trim();
}
