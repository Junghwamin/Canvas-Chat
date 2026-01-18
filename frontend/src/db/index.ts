import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Canvas, ChatNode, Attachment, APISettings } from '../types';

export class CanvasChatDB extends Dexie {
  canvases!: Table<Canvas>;
  nodes!: Table<ChatNode>;
  attachments!: Table<Attachment>;
  settings!: Table<APISettings & { id: string }>;

  constructor() {
    super('CanvasChatDB');

    this.version(1).stores({
      canvases: 'id, name, createdAt, updatedAt',
      nodes: 'id, canvasId, parentId, type, createdAt',
      attachments: 'id, nodeId, type, createdAt',
      settings: 'id',
    });
  }
}

export const db = new CanvasChatDB();

// Canvas CRUD
export const canvasService = {
  async create(canvas: Omit<Canvas, 'id' | 'createdAt' | 'updatedAt'>): Promise<Canvas> {
    const now = new Date();
    const newCanvas: Canvas = {
      ...canvas,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.canvases.add(newCanvas);
    return newCanvas;
  },

  async getAll(): Promise<Canvas[]> {
    return db.canvases.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<Canvas | undefined> {
    return db.canvases.get(id);
  },

  async update(id: string, updates: Partial<Canvas>): Promise<void> {
    await db.canvases.update(id, { ...updates, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    // 캔버스와 관련된 모든 노드 및 첨부파일 삭제
    const nodes = await db.nodes.where('canvasId').equals(id).toArray();
    const nodeIds = nodes.map(n => n.id);

    await db.attachments.where('nodeId').anyOf(nodeIds).delete();
    await db.nodes.where('canvasId').equals(id).delete();
    await db.canvases.delete(id);
  },
};

// Node CRUD
export const nodeService = {
  async create(node: Omit<ChatNode, 'id' | 'createdAt'>): Promise<ChatNode> {
    const newNode: ChatNode = {
      ...node,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    await db.nodes.add(newNode);
    return newNode;
  },

  async getByCanvasId(canvasId: string): Promise<ChatNode[]> {
    return db.nodes.where('canvasId').equals(canvasId).toArray();
  },

  async getById(id: string): Promise<ChatNode | undefined> {
    return db.nodes.get(id);
  },

  async update(id: string, updates: Partial<ChatNode>): Promise<void> {
    await db.nodes.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    // 첨부파일도 삭제
    await db.attachments.where('nodeId').equals(id).delete();
    await db.nodes.delete(id);
  },

  async getChildren(parentId: string): Promise<ChatNode[]> {
    return db.nodes.where('parentId').equals(parentId).toArray();
  },

  // 경로 추적 (현재 노드 → 루트) - 성능 최적화 버전
  async getPathToRoot(nodeId: string): Promise<ChatNode[]> {
    // 시작 노드 가져오기
    const startNode = await db.nodes.get(nodeId);
    if (!startNode) return [];

    // 해당 캔버스의 모든 노드를 한 번에 로드 (N번 쿼리 -> 1번 쿼리)
    const allNodes = await db.nodes.where('canvasId').equals(startNode.canvasId).toArray();
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));

    // 경로 추적 (push 사용 후 reverse - O(1) + O(n))
    const path: ChatNode[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = nodeMap.get(currentId);
      if (!node) break;
      path.push(node); // O(1)
      currentId = node.parentId;
    }

    return path.reverse(); // 한 번만 O(n)
  },
};

// Attachment CRUD
export const attachmentService = {
  async create(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<Attachment> {
    const newAttachment: Attachment = {
      ...attachment,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    await db.attachments.add(newAttachment);
    return newAttachment;
  },

  async getByNodeId(nodeId: string): Promise<Attachment[]> {
    return db.attachments.where('nodeId').equals(nodeId).toArray();
  },

  async delete(id: string): Promise<void> {
    await db.attachments.delete(id);
  },
};

// Settings
export const settingsService = {
  async get(): Promise<APISettings> {
    const settings = await db.settings.get('main');
    return settings || { defaultModel: 'gpt-4o-mini' };
  },

  async save(settings: APISettings): Promise<void> {
    await db.settings.put({ ...settings, id: 'main' });
  },
};
