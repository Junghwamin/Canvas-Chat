// Canvas (프로젝트)
export interface Canvas {
  id: string;
  name: string;
  systemPrompt: string;
  splitMode: boolean;  // AI 응답을 주제별 노드로 분할할지 여부
  createdAt: Date;
  updatedAt: Date;
  rootNodeId: string | null;
}

// Node (메시지)
export interface ChatNode {
  id: string;
  canvasId: string;
  parentId: string | null;
  type: 'user' | 'assistant' | 'system';
  content: string;
  summary: string;
  compressedContent?: string;
  isCompressed: boolean;
  isCollapsed?: boolean;  // 하위 노드 접힘 여부
  model?: string;
  tokenCount?: number;
  attachments?: string[]; // Attachment IDs
  createdAt: Date;
  position: { x: number; y: number };
}

// Attachment (첨부 파일)
export interface Attachment {
  id: string;
  nodeId: string;
  type: 'image' | 'pdf' | 'text' | 'code';
  filename: string;
  mimeType: string;
  size: number;
  data: Blob;
  extractedText?: string;
  createdAt: Date;
}

// API 설정
export interface APISettings {
  openaiKey?: string;
  googleKey?: string;
  defaultModel: string;
}

// 지원 모델
export type ModelType =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4.5-preview'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro';

export interface ModelInfo {
  id: ModelType;
  name: string;
  provider: 'openai' | 'google';
  maxTokens: number;
  inputPrice: number; // per 1M tokens
  outputPrice: number;
}

export const MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxTokens: 128000, inputPrice: 2.5, outputPrice: 10 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxTokens: 128000, inputPrice: 0.15, outputPrice: 0.6 },
  { id: 'gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'openai', maxTokens: 128000, inputPrice: 75, outputPrice: 150 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', maxTokens: 1000000, inputPrice: 0.1, outputPrice: 0.4 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', maxTokens: 2000000, inputPrice: 1.25, outputPrice: 5 },
];

// React Flow 노드 데이터
export interface NodeData {
  chatNode: ChatNode;
  isSelected: boolean;
  childCount: number;  // 하위 노드 개수 (접힘 상태에서 표시용)
  onAddChild: (parentId: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;  // 접기/펼치기 토글
}

// 메시지 (API 전송용)
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
