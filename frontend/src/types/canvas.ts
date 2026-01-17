import { Node, Edge } from '@xyflow/react';

// Message Types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: string;
  parentId?: string | null;
  metadata?: {
    tokens?: number;
    finishReason?: string;
    sources?: Array<{ document: string; page: number }>;
  };
}

// Node Types
export type ChatNode = Node<{
  message: Message;
  isCollapsed?: boolean;
  childCount?: number;
}>;

export type ChatEdge = Edge;

// Canvas Types
export interface Canvas {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: ChatNode[];
  edges: ChatEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// LLM Provider Types
export type LLMProvider = 'openai' | 'google';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number;
}

export interface LLMSettings {
  openaiApiKey?: string;
  googleApiKey?: string;
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
}

// Export/Import Types
export interface ExportData {
  version: string;
  canvas: Canvas;
  exportedAt: number;
}

export interface SearchResult {
  nodeId: string;
  content: string;
  role: MessageRole;
  timestamp: number;
}
