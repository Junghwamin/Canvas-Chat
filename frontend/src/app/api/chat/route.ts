import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    const client = new OpenAI({ apiKey });

    // 이미지가 있는 경우 Vision API 형식으로 변환
    let formattedMessages = messages;
    if (images && images.length > 0) {
      formattedMessages = messages.map((m: any, index: number) => {
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
    }

    const stream = await client.chat.completions.create({
      model,
      messages: formattedMessages,
      stream: true,
    });

    // ReadableStream으로 스트리밍 응답 생성
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
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
    console.error('OpenAI API Error:', error);
    return NextResponse.json(
      { error: error.message || 'API 호출 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
