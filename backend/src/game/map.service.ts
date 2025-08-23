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
  private readonly CHUNK_SIZE_IN_TILES = 20; // 20x20, как в вашем коде

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
    // Используем `this.generateMap` для создания чанка, если он не существует.
    // Это гарантирует, что мы всегда получим либо существующий, либо новый чанк.
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
   * Добавляет предмет на карту в указанные тайловые координаты.
   */
  addItemToMap(x: number, y: number, itemType: string): { chunk: string, x: number, y: number, type: string } | null {
    const chunkX = Math.floor(x / this.CHUNK_SIZE_IN_TILES);
    const chunkY = Math.floor(y / this.CHUNK_SIZE_IN_TILES);
    const key = `${chunkX}_${chunkY}`;

    const chunk = this.getChunk(chunkX, chunkY);
    if (!chunk) return null;

    const tileXInChunk = x % this.CHUNK_SIZE_IN_TILES;
    const tileYInChunk = y % this.CHUNK_SIZE_IN_TILES;

    // Проверяем, не занят ли уже этот тайл
    // const occupied = chunk.items.some(i => i.x === tileXInChunk && i.y === tileYInChunk);
    // if (occupied) {
    //   console.log(`Не удалось добавить предмет ${itemType} на координаты ${x}, ${y}: место занято.`);
    //   return null;
    // }

    const newItem = { x: tileXInChunk, y: tileYInChunk + 1, type: itemType };
    chunk.items.push(newItem);
    
    return {
        chunk: key,
        x: newItem.x,
        y: newItem.y,
        type: newItem.type
    };
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