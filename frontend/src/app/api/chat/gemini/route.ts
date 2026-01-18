import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model, apiKey, images } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    const client = new GoogleGenerativeAI(apiKey);
    const genModel = client.getGenerativeModel({ model });

    // 시스템 프롬프트 및 히스토리 분리
    const systemPrompt = messages.find((m: any) => m.role === 'system')?.content || '';
    const history = messages
      .filter((m: any) => m.role !== 'system')
      .slice(0, -1)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: '마지막 메시지가 사용자 메시지가 아닙니다.' },
        { status: 400 }
      );
    }

    // 이미지가 있는 경우 parts에 추가
    const parts: any[] = [{ text: lastMessage.content }];
    if (images && images.length > 0) {
      for (const img of images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64,
          },
        });
      }
    }

    const chat = genModel.startChat({
      history: history as any,
      systemInstruction: systemPrompt || undefined,
    });

    const result = await chat.sendMessageStream(parts);

    // ReadableStream으로 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { error: error.message || 'API 호출 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
