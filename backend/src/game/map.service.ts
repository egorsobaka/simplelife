// map.service.ts
import { Injectable } from '@nestjs/common';
import { generateMap, type MapTile, type Item } from './mapGenerator.js';

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

    const { map, items } = generateMap(chunkX, chunkY); // Phaser.Scene не нужен на сервере

    // сериализуем тайлы
    const tiles = map.map(row => row.map(tile => ({ type: tile.type })));
    const serializedItems = items.map(i => ({ x: i.x, y: i.y, type: i.type }));

    const chunkData: ChunkData = { tiles, items: serializedItems };
    this.loadedChunks[key] = chunkData;
    return chunkData;
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
}
