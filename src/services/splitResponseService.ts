/**
 * AI 응답을 마크다운 헤딩 기준으로 분할하는 서비스
 */

export interface SplitSection {
    title: string;      // 헤딩 텍스트 (예: "개요", "큐비트란?")
    content: string;    // 섹션 내용
}

/**
 * 마크다운 콘텐츠를 ## 또는 ### 헤딩 기준으로 분할
 * @param content AI 응답 전체 텍스트
 * @returns 분할된 섹션 배열
 */
export function splitByHeadings(content: string): SplitSection[] {
    // 헤딩이 없으면 분할하지 않음
    if (!content.includes('## ') && !content.includes('### ')) {
        return [];
    }

    // ## 또는 ### 헤딩으로 분할 (헤딩 포함하여 분할)
    const sections = content.split(/(?=^#{2,3}\s)/m);

    const result: SplitSection[] = [];

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // 헤딩 추출
        const headingMatch = trimmed.match(/^#{2,3}\s*(.+?)[\n\r]/);

        if (headingMatch) {
            // 헤딩이 있는 섹션
            const title = headingMatch[1].trim();
            const contentAfterHeading = trimmed.replace(/^#{2,3}\s*.+[\n\r]/, '').trim();

            if (contentAfterHeading.length > 0) {
                result.push({
                    title,
                    content: contentAfterHeading,
                });
            }
        } else if (result.length === 0 && trimmed.length > 50) {
            // 첫 번째 섹션이고 헤딩이 없는 경우 (서론/개요)
            result.push({
                title: '개요',
                content: trimmed,
            });
        }
    }

    return result;
}

/**
 * 분할된 섹션들의 위치 계산
 * @param parentPosition 부모 노드 위치
 * @param sectionCount 섹션 개수
 * @param nodeWidth 노드 너비 (기본 250)
 * @param nodeHeight 노드 간격 (기본 150)
 */
export function calculateSplitNodePositions(
    parentPosition: { x: number; y: number },
    sectionCount: number,
    nodeWidth = 280,
    nodeHeight = 150
): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];

    // 전체 너비 계산
    const totalWidth = (sectionCount - 1) * nodeWidth;
    const startX = parentPosition.x - totalWidth / 2;

    for (let i = 0; i < sectionCount; i++) {
        positions.push({
            x: startX + i * nodeWidth,
            y: parentPosition.y + nodeHeight,
        });
    }

    return positions;
}

/**
 * 분할 모드용 시스템 프롬프트 추가 문구
 */
export const SPLIT_MODE_PROMPT = `
응답할 때 각 주요 주제나 개념을 ## 헤딩으로 구분해서 설명해주세요.
각 섹션은 독립적으로 이해할 수 있도록 작성해주세요.

예시 형식:
## 개요
간단한 소개...

## 주제 1
상세 설명...

## 주제 2
상세 설명...
`;
