import Dexie, { Table } from 'dexie';
import { Canvas, LLMSettings } from '@/types/canvas';

// IndexedDB Database for Canvas Chat
export class CanvasDatabase extends Dexie {
    canvases!: Table<Canvas, string>;
    settings!: Table<{ id: string; data: LLMSettings }, string>;

    constructor() {
        super('CanvasChatDB');

        this.version(1).stores({
            canvases: 'id, name, createdAt, updatedAt',
            settings: 'id',
        });
    }
}

export const db = new CanvasDatabase();
