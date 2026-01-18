// 통계 데이터 파싱 유틸리티

export interface StatisticsData {
  label: string;
  value: number;
  unit?: string;
  category?: string;
}

export interface ParsedStatistics {
  type: 'table' | 'list' | 'comparison' | 'percentage';
  title?: string;
  data: StatisticsData[];
  chartType: 'bar' | 'line' | 'pie' | 'area';
  rawContent: string;
}

// 마크다운 테이블 파싱
function parseMarkdownTable(content: string): StatisticsData[] | null {
  const tableRegex = /\|([^|]+)\|([^|]+)\|/g;
  const rows: string[][] = [];

  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const col1 = match[1].trim();
    const col2 = match[2].trim();

    // 헤더 구분선 스킵 (----)
    if (col1.includes('-') && col2.includes('-')) continue;

    rows.push([col1, col2]);
  }

  if (rows.length < 2) return null;

  // 첫 행이 헤더인지 확인
  const hasHeader = isNaN(parseNumber(rows[0][1]));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const data: StatisticsData[] = [];
  for (const row of dataRows) {
    const label = row[0];
    const { value, unit } = extractNumberAndUnit(row[1]);
    if (!isNaN(value)) {
      data.push({ label, value, unit });
    }
  }

  return data.length > 0 ? data : null;
}

// 숫자 리스트 파싱 (1. 항목: 100, - 항목: 200)
function parseNumberedList(content: string): StatisticsData[] | null {
  const listRegex = /(?:^|\n)\s*(?:\d+\.|-|\*)\s*([^:\n]+)[:：]\s*([^\n]+)/g;
  const data: StatisticsData[] = [];

  let match;
  while ((match = listRegex.exec(content)) !== null) {
    const label = match[1].trim();
    const valueStr = match[2].trim();
    const { value, unit } = extractNumberAndUnit(valueStr);

    if (!isNaN(value)) {
      data.push({ label, value, unit });
    }
  }

  return data.length > 0 ? data : null;
}

// 퍼센트 데이터 파싱
function parsePercentages(content: string): StatisticsData[] | null {
  const percentRegex = /([가-힣a-zA-Z0-9\s]+)[:\-]?\s*(\d+(?:\.\d+)?)\s*%/g;
  const data: StatisticsData[] = [];

  let match;
  while ((match = percentRegex.exec(content)) !== null) {
    const label = match[1].trim();
    const value = parseFloat(match[2]);

    if (!isNaN(value) && label.length > 0) {
      data.push({ label, value, unit: '%' });
    }
  }

  return data.length > 0 ? data : null;
}

// 비교 데이터 파싱 (A vs B)
function parseComparison(content: string): StatisticsData[] | null {
  const comparisonRegex =
    /([가-힣a-zA-Z0-9\s]+)\s*(?:vs|VS|대비|대|:)\s*([가-힣a-zA-Z0-9\s]+)[:\-]?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:대|:)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/g;
  const data: StatisticsData[] = [];

  let match;
  while ((match = comparisonRegex.exec(content)) !== null) {
    const label1 = match[1].trim();
    const label2 = match[2].trim();
    const value1 = parseNumber(match[3]);
    const value2 = parseNumber(match[4]);

    if (!isNaN(value1) && !isNaN(value2)) {
      data.push({ label: label1, value: value1 });
      data.push({ label: label2, value: value2 });
    }
  }

  return data.length > 0 ? data : null;
}

// 숫자와 단위 추출
function extractNumberAndUnit(str: string): { value: number; unit?: string } {
  // 쉼표 제거
  const cleanStr = str.replace(/,/g, '');

  // 숫자 + 단위 패턴
  const match = cleanStr.match(/^([\d.]+)\s*([가-힣a-zA-Z%]+)?$/);

  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2] || undefined,
    };
  }

  // 통화 패턴 ($100, 100원, 100달러)
  const currencyMatch = cleanStr.match(/^[$₩]?([\d.]+)\s*([원달러$%]*)?$/);
  if (currencyMatch) {
    let unit = currencyMatch[2];
    if (cleanStr.startsWith('$')) unit = '달러';
    if (cleanStr.startsWith('₩')) unit = '원';

    return {
      value: parseFloat(currencyMatch[1]),
      unit: unit || undefined,
    };
  }

  return { value: parseNumber(cleanStr) };
}

// 숫자 파싱 (쉼표 처리)
function parseNumber(str: string): number {
  const cleaned = str.replace(/,/g, '').replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned);
}

// 차트 타입 추천
function recommendChartType(data: StatisticsData[], type: string): 'bar' | 'line' | 'pie' | 'area' {
  // 퍼센트 데이터는 파이 차트 추천
  if (type === 'percentage' || data.every((d) => d.unit === '%')) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    // 합이 100%에 가까우면 파이 차트
    if (total >= 95 && total <= 105) {
      return 'pie';
    }
  }

  // 시계열 데이터 감지 (년도, 월, 분기)
  const timePatterns = [/\d{4}년?/, /\d+월/, /\d+분기/, /Q[1-4]/, /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i];
  const hasTimeData = data.some((d) => timePatterns.some((p) => p.test(d.label)));

  if (hasTimeData) {
    return 'line';
  }

  // 비교 데이터는 바 차트
  if (type === 'comparison') {
    return 'bar';
  }

  // 데이터 개수에 따라 결정
  if (data.length <= 5) {
    return 'pie';
  }

  return 'bar';
}

// 제목 추출
function extractTitle(content: string): string | undefined {
  // ## 또는 ### 헤딩 찾기
  const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // **굵은 텍스트** 찾기
  const boldMatch = content.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) {
    return boldMatch[1].trim();
  }

  return undefined;
}

// 메인 파싱 함수
export function parseStatistics(content: string): ParsedStatistics | null {
  // 최소 길이 체크
  if (content.length < 20) return null;

  // 숫자가 최소 2개 이상 있어야 함
  const numberMatches = content.match(/\d+(?:\.\d+)?/g);
  if (!numberMatches || numberMatches.length < 2) return null;

  let data: StatisticsData[] | null = null;
  let type: ParsedStatistics['type'] = 'list';

  // 1. 마크다운 테이블 시도
  data = parseMarkdownTable(content);
  if (data && data.length >= 2) {
    type = 'table';
  }

  // 2. 숫자 리스트 시도
  if (!data) {
    data = parseNumberedList(content);
    if (data && data.length >= 2) {
      type = 'list';
    }
  }

  // 3. 퍼센트 데이터 시도
  if (!data) {
    data = parsePercentages(content);
    if (data && data.length >= 2) {
      type = 'percentage';
    }
  }

  // 4. 비교 데이터 시도
  if (!data) {
    data = parseComparison(content);
    if (data && data.length >= 2) {
      type = 'comparison';
    }
  }

  // 유효한 데이터가 없으면 null 반환
  if (!data || data.length < 2) return null;

  return {
    type,
    title: extractTitle(content),
    data,
    chartType: recommendChartType(data, type),
    rawContent: content,
  };
}

// 통계 데이터 검증
export function isValidStatistics(stats: ParsedStatistics | null): boolean {
  if (!stats) return false;
  if (stats.data.length < 2) return false;

  // 모든 값이 유효한 숫자인지 확인
  return stats.data.every((d) => typeof d.value === 'number' && !isNaN(d.value) && isFinite(d.value));
}
