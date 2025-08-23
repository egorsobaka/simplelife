// map.service.ts
import { Injectable } from '@nestjs/common';
import { generateMap } from './mapGenerator.js';

export interface ChunkData {
  tiles: { type: string }[][];
  items: { x: number; y: number; type: string }[];
}

@Injectable()
export class MapService {
  private loadedChunks: Record<string, ChunkData> = {};

  generateMap(chunkX: number, chunkY: number): ChunkData {
    const key = `${chunkX}_${chunkY}`;
    if (this.loadedChunks[key]) return this.loadedChunks[key];

    const { map, items } = generateMap(chunkX, chunkY);

    const tiles = map.map(row => row.map(tile => ({ type: tile.type })));
    const serializedItems = items.map(i => ({ x: i.x, y: i.y, type: i.type }));

    const chunkData: ChunkData = { tiles, items: serializedItems };
    this.loadedChunks[key] = chunkData;
    return chunkData;
  }

  getChunk(chunkX: number, chunkY: number): ChunkData | null {
    const key = `${chunkX}_${chunkY}`;
    return this.loadedChunks[key] ?? this.generateMap(chunkX, chunkY);
  }

  getChunksAround(cx: number, cy: number): Record<string, ChunkData> {
    const chunks: Record<string, ChunkData> = {};
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx}_${cy + dy}`;
        chunks[key] = this.generateMap(cx + dx, cy + dy);
      }
    }
    return chunks;
  }

  /**
   * Удаляет предмет из чанка (при сборе игроком).
   * Возвращает true, если предмет был найден и удалён.
   */
  removeItem(chunkX: number, chunkY: number, itemX: number, itemY: number): { type: string } | null {
    const chunk = this.getChunk(chunkX, chunkY);
    if (!chunk) return null;

    const index = chunk.items.findIndex(i => i.x === itemX && i.y === itemY);
    if (index >= 0) {
      const [removed] = chunk.items.splice(index, 1);
      return { type: removed.type };
    }
    return null;
  }
}
