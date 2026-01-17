import { create } from 'zustand';
import type { Canvas, ChatNode, APISettings, ModelType } from '../types';
import { canvasService, nodeService, settingsService } from '../db';

interface CanvasState {
  // 캔버스 목록
  canvases: Canvas[];
  currentCanvas: Canvas | null;
  isLoading: boolean;

  // 노드
  nodes: ChatNode[];
  selectedNodeId: string | null;

  // 설정
  settings: APISettings;
  currentModel: ModelType;

  // UI 상태
  isGenerating: boolean;
  error: string | null;

  // 캔버스 액션
  loadCanvases: () => Promise<void>;
  createCanvas: (name: string, systemPrompt?: string) => Promise<Canvas>;
  selectCanvas: (id: string) => Promise<void>;
  updateCanvas: (id: string, updates: Partial<Canvas>) => Promise<void>;
  deleteCanvas: (id: string) => Promise<void>;

  // 노드 액션
  loadNodes: (canvasId: string) => Promise<void>;
  addNode: (node: Omit<ChatNode, 'id' | 'createdAt'>) => Promise<ChatNode>;
  updateNode: (id: string, updates: Partial<ChatNode>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  getPathToRoot: (nodeId: string) => Promise<ChatNode[]>;

  // 설정 액션
  loadSettings: () => Promise<void>;
  saveSettings: (settings: APISettings) => Promise<void>;
  setCurrentModel: (model: ModelType) => void;

  // UI 액션
  setGenerating: (isGenerating: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // 초기 상태
  canvases: [],
  currentCanvas: null,
  isLoading: false,
  nodes: [],
  selectedNodeId: null,
  settings: { defaultModel: 'gpt-4o-mini' },
  currentModel: 'gpt-4o-mini',
  isGenerating: false,
  error: null,

  // 캔버스 액션
  loadCanvases: async () => {
    set({ isLoading: true });
    try {
      const canvases = await canvasService.getAll();
      set({ canvases, isLoading: false });
    } catch (error) {
      set({ error: '캔버스 목록을 불러오는데 실패했습니다.', isLoading: false });
    }
  },

  createCanvas: async (name: string, systemPrompt = '') => {
    const canvas = await canvasService.create({
      name,
      systemPrompt,
      splitMode: false,  // 기본값: 분할 모드 끔
      rootNodeId: null,
    });
    set((state) => ({ canvases: [canvas, ...state.canvases] }));
    return canvas;
  },

  selectCanvas: async (id: string) => {
    const canvas = await canvasService.getById(id);
    if (canvas) {
      set({ currentCanvas: canvas, selectedNodeId: null });
      await get().loadNodes(id);
    }
  },

  updateCanvas: async (id: string, updates: Partial<Canvas>) => {
    await canvasService.update(id, updates);
    set((state) => ({
      canvases: state.canvases.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      currentCanvas: state.currentCanvas?.id === id ? { ...state.currentCanvas, ...updates } : state.currentCanvas,
    }));
  },

  deleteCanvas: async (id: string) => {
    await canvasService.delete(id);
    set((state) => ({
      canvases: state.canvases.filter((c) => c.id !== id),
      currentCanvas: state.currentCanvas?.id === id ? null : state.currentCanvas,
      nodes: state.currentCanvas?.id === id ? [] : state.nodes,
    }));
  },

  // 노드 액션
  loadNodes: async (canvasId: string) => {
    const nodes = await nodeService.getByCanvasId(canvasId);
    set({ nodes });
  },

  addNode: async (node) => {
    const newNode = await nodeService.create(node);
    set((state) => ({ nodes: [...state.nodes, newNode] }));

    // 첫 번째 노드인 경우 rootNodeId 설정
    if (!node.parentId && get().currentCanvas) {
      await get().updateCanvas(get().currentCanvas!.id, { rootNodeId: newNode.id });
    }

    return newNode;
  },

  updateNode: async (id: string, updates: Partial<ChatNode>) => {
    await nodeService.update(id, updates);
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  deleteNode: async (id: string) => {
    // 자식 노드들도 재귀적으로 삭제
    const deleteRecursive = async (nodeId: string) => {
      const children = await nodeService.getChildren(nodeId);
      for (const child of children) {
        await deleteRecursive(child.id);
      }
      await nodeService.delete(nodeId);
    };

    await deleteRecursive(id);
    const nodes = await nodeService.getByCanvasId(get().currentCanvas!.id);
    set({ nodes, selectedNodeId: null });
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id });
  },

  getPathToRoot: async (nodeId: string) => {
    return nodeService.getPathToRoot(nodeId);
  },

  // 설정 액션
  loadSettings: async () => {
    const settings = await settingsService.get();
    set({ settings, currentModel: settings.defaultModel as ModelType });
  },

  saveSettings: async (settings: APISettings) => {
    await settingsService.save(settings);
    set({ settings });
  },

  setCurrentModel: (model: ModelType) => {
    set({ currentModel: model });
  },

  // UI 액션
  setGenerating: (isGenerating: boolean) => {
    set({ isGenerating });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
