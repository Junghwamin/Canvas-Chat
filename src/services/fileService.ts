import * as pdfjsLib from 'pdfjs-dist';
import { attachmentService } from '../db';
import type { Attachment } from '../types';

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// 파일 타입 판별
export function getFileType(file: File): Attachment['type'] {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql'].includes(extension || '')
  ) {
    return 'code';
  }
  return 'text';
}

// 파일을 Blob으로 읽기
export async function readFileAsBlob(file: File): Promise<Blob> {
  return new Blob([await file.arrayBuffer()], { type: file.type });
}

// PDF 텍스트 추출
export async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('PDF 텍스트 추출 오류:', error);
    return '';
  }
}

// 텍스트 파일 읽기
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// 이미지를 Base64로 변환
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 첨부파일 처리 및 저장
export async function processAndSaveAttachment(
  file: File,
  nodeId: string
): Promise<Attachment> {
  const fileType = getFileType(file);
  const blob = await readFileAsBlob(file);

  let extractedText: string | undefined;

  // 파일 타입에 따라 텍스트 추출
  switch (fileType) {
    case 'pdf':
      extractedText = await extractPdfText(file);
      break;
    case 'text':
    case 'code':
      extractedText = await readTextFile(file);
      break;
    default:
      extractedText = undefined;
  }

  // IndexedDB에 저장
  const attachment = await attachmentService.create({
    nodeId,
    type: fileType,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    data: blob,
    extractedText,
  });

  return attachment;
}

// 첨부파일 미리보기 URL 생성
export function getAttachmentPreviewUrl(attachment: Attachment): string {
  return URL.createObjectURL(attachment.data);
}

// 첨부파일 크기 포맷
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Vision API용 이미지 처리
export async function prepareImageForVision(file: File): Promise<{ base64: string; mimeType: string }> {
  const base64 = await imageToBase64(file);
  // data:image/jpeg;base64, 부분 제거
  const base64Data = base64.split(',')[1];
  return {
    base64: base64Data,
    mimeType: file.type,
  };
}
