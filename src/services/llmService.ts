import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message, ModelType } from '../types';
import { MODELS } from '../types';

// API 클라이언트 생성
const getOpenAIClient = (apiKey: string) => {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // 브라우저에서 사용 허용
  });
};

const getGoogleClient = (apiKey: string) => {
  return new GoogleGenerativeAI(apiKey);
};

// 스트리밍 응답 생성
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

    const client = getOpenAIClient(apiKeys.openai);
    const stream = await client.chat.completions.create({
      model: model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } else if (modelInfo.provider === 'google') {
    if (!apiKeys.google) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }

    const client = getGoogleClient(apiKeys.google);
    const genModel = client.getGenerativeModel({ model: model });

    // Gemini 형식으로 변환
    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = history.pop();
    if (!lastMessage) {
      throw new Error('메시지가 없습니다.');
    }

    const chat = genModel.startChat({
      history: history as any,
      systemInstruction: systemPrompt || undefined,
    });

    const result = await chat.sendMessageStream(lastMessage.parts[0].text);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
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

    const client = getOpenAIClient(apiKeys.openai);

    // 마지막 사용자 메시지에 이미지 추가
    const formattedMessages = messages.map((m, index) => {
      if (index === messages.length - 1 && m.role === 'user') {
        const content: any[] = [{ type: 'text', text: m.content }];
        for (const img of images) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
            },
          });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    const stream = await client.chat.completions.create({
      model: model,
      messages: formattedMessages as any,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } else if (modelInfo.provider === 'google') {
    if (!apiKeys.google) {
      throw new Error('Google API 키가 설정되지 않았습니다.');
    }

    const client = getGoogleClient(apiKeys.google);
    const genModel = client.getGenerativeModel({ model: model });

    const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
    const history = messages
      .filter((m) => m.role !== 'system')
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('마지막 메시지가 사용자 메시지가 아닙니다.');
    }

    // 이미지 파트 추가
    const parts: any[] = [{ text: lastMessage.content }];
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      });
    }

    const chat = genModel.startChat({
      history: history as any,
      systemInstruction: systemPrompt || undefined,
    });

    const result = await chat.sendMessageStream(parts);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
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

// 맥락 압축
export async function compressContext(
  content: string,
  apiKeys: { openai?: string; google?: string }
): Promise<string> {
  // 간단한 압축: 긴 내용을 요약
  if (content.length <= 500) return content;

  // LLM을 사용한 압축 (선택적)
  if (apiKeys.openai) {
    try {
      const client = getOpenAIClient(apiKeys.openai);
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '다음 내용을 핵심만 남기고 200자 이내로 요약하세요.',
          },
          { role: 'user', content },
        ],
        max_tokens: 200,
      });
      return response.choices[0]?.message?.content || content.substring(0, 200);
    } catch {
      return content.substring(0, 200) + '...';
    }
  }

  return content.substring(0, 200) + '...';
}
