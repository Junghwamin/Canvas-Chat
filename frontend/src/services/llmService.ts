import type { Message, ModelType } from '../types';
import { MODELS } from '../types';

// 스트리밍 응답 생성 (서버 API 프록시 사용)
export async function* streamChat(
  messages: Message[],
  model: ModelType,
  apiKeys: { openai?: string; google?: string }
): AsyncGenerator<string, void, unknown> {
  const modelInfo = MODELS.find((m) => m.id === model);
  if (!modelInfo) {
    throw new Error(`지원하지 않는 모델입니다: ${model}`);
  }

  if (modelInfo.provider === 'openai') {
    if (!apiKeys.openai) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model,
        apiKey: apiKeys.openai,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 호출 실패');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } else if (modelInfo.provider === 'google') {
    if (!apiKeys.google) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('/api/chat/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model,
        apiKey: apiKeys.google,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 호출 실패');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  }
}

// 이미지 포함 스트리밍 응답 생성 (Vision API)
export async function* streamChatWithImages(
  messages: Message[],
  model: ModelType,
  apiKeys: { openai?: string; google?: string },
  images: { base64: string; mimeType: string }[]
): AsyncGenerator<string, void, unknown> {
  const modelInfo = MODELS.find((m) => m.id === model);
  if (!modelInfo) {
    throw new Error(`지원하지 않는 모델입니다: ${model}`);
  }

  if (modelInfo.provider === 'openai') {
    if (!apiKeys.openai) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model,
        apiKey: apiKeys.openai,
        images,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 호출 실패');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  } else if (modelInfo.provider === 'google') {
    if (!apiKeys.google) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }

    const response = await fetch('/api/chat/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        model,
        apiKey: apiKeys.google,
        images,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 호출 실패');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield decoder.decode(value, { stream: true });
    }
  }
}

// 자동 요약 생성
export async function generateSummary(
  content: string,
  _apiKeys: { openai?: string; google?: string }
): Promise<string> {
  // 클라이언트 사이드 간단 요약 (첫 50자)
  const simpleSummary = content.substring(0, 50).replace(/\n/g, ' ').trim();
  if (simpleSummary.length < content.length) {
    return simpleSummary + '...';
  }
  return simpleSummary;
}

// 토큰 수 추정 (간단한 추정)
export function estimateTokens(text: string): number {
  // 대략적으로 4글자당 1토큰
  return Math.ceil(text.length / 4);
}

// 최대 컨텍스트 토큰 제한 (안전 마진 포함)
export const MAX_CONTEXT_TOKENS = 60000; // GPT-4o의 절반 정도로 설정하여 응답 공간 확보

// 컨텍스트 크기 제한
export function limitContextSize(
  messages: Message[],
  maxTokens: number = MAX_CONTEXT_TOKENS
): Message[] {
  let currentTokens = 0;
  const limitedMessages: Message[] = [];

  // 뒤에서부터(최신 메시지부터) 추가
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokens(msg.content);

    if (currentTokens + tokens > maxTokens) {
      // 시스템 메시지는 항상 포함되도록 노력
      if (msg.role === 'system') {
        limitedMessages.unshift(msg);
      }
      break;
    }

    limitedMessages.unshift(msg);
    currentTokens += tokens;
  }

  // 시스템 메시지가 없으면(짤렸으면) 원본의 첫 번째가 시스템인지 확인 후 추가 고려
  // (여기서는 간단히 최신순 유지)

  return limitedMessages;
}

// 텍스트 자르기 (토큰 제한)
export function truncateText(text: string, maxTokens: number = 30000): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;

  const maxLength = maxTokens * 4;
  return text.substring(0, maxLength) + `\n\n... [내용이 너무 길어 ${maxTokens} 토큰으로 잘렸습니다] ...`;
}

// 대화 요약 생성 (AI 정리 기능)
export async function* generateConversationSummary(
  conversationMarkdown: string,
  model: ModelType,
  apiKeys: { openai?: string; google?: string }
): AsyncGenerator<string, void, unknown> {
  const systemPrompt = `당신은 대화 요약 전문가입니다. 다음 대화를 분석하여 구조화된 요약을 작성해주세요.

## 출력 형식 (반드시 준수):

### 핵심 내용
- 대화의 주요 주제 3-5개를 불릿 포인트로 정리

### 주요 논점
- 논의된 중요한 포인트들
- 각 논점에 대한 결론이나 합의점

### 결론
- 최종 결론이나 액션 아이템
- 다음 단계에 대한 제안

### 추가 인사이트
- 대화에서 도출된 추가 인사이트나 제안
- 개선점이나 주의사항

마크다운 형식으로 깔끔하게 작성하세요.`;

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `다음 대화를 분석하고 정리해주세요:\n\n${conversationMarkdown}` },
  ];

  yield* streamChat(messages, model, apiKeys);
}

// 맥락 압축
export async function compressContext(
  content: string,
  apiKeys: { openai?: string; google?: string }
): Promise<string> {
  // 간단한 압축: 긴 내용을 요약
  if (content.length <= 500) return content;

  // 서버 API를 통한 압축
  if (apiKeys.openai) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: '다음 내용을 핵심만 남기고 200자 이내로 요약하세요.',
            },
            { role: 'user', content },
          ],
          model: 'gpt-4o-mini',
          apiKey: apiKeys.openai,
        }),
      });

      if (!response.ok) {
        return content.substring(0, 200) + '...';
      }

      const reader = response.body?.getReader();
      if (!reader) return content.substring(0, 200) + '...';

      const decoder = new TextDecoder();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(decoder.decode(value, { stream: true }));
      }
      return chunks.join('') || content.substring(0, 200);
    } catch {
      return content.substring(0, 200) + '...';
    }
  }

  return content.substring(0, 200) + '...';
}
