// map.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { generateMap } from './mapGenerator.js';
import { ChunkDocument } from './chunk.schema';

export interface ChunkData {
  tiles: { type: string }[][];
  items: { x: number; y: number; type: string }[];
}

@Injectable()
export class MapService implements OnModuleInit, OnModuleDestroy {
  private loadedChunks: Record<string, ChunkData> = {};
  private readonly CHUNK_SIZE_IN_TILES = 20;
  private readonly SAVE_INTERVAL = 1000 * 60 * 5;
  private saveInterval: NodeJS.Timeout;

  constructor(
    @InjectModel('Chunk') private readonly chunkModel: Model<ChunkDocument>
  ) { }

  async onModuleInit() {
    await this.loadInitialChunks();

    this.saveInterval = setInterval(() => {
      this.saveAllChunks();
    }, this.SAVE_INTERVAL);
  }

  onModuleDestroy() {
    if (this.saveInterval) clearInterval(this.saveInterval);
    this.saveAllChunks();
  }

  private async loadInitialChunks() {
    try {
      const initialChunks = await this.chunkModel.find({
        $or: [
          { chunkX: { $gte: -1, $lte: 1 }, chunkY: { $gte: -1, $lte: 1 } }
        ]
      }).exec();

      initialChunks.forEach(chunkDoc => {
        const key = `${chunkDoc.chunkX}_${chunkDoc.chunkY}`;
        this.loadedChunks[key] = {
          tiles: chunkDoc.tiles,
          items: chunkDoc.items
        };
      });

      console.log(`Загружено ${initialChunks.length} чанков из MongoDB`);
    } catch (error) {
      console.error('Ошибка загрузки чанков из MongoDB:', error);
    }
  }

  private async saveAllChunks() {
    try {
      const savePromises = Object.entries(this.loadedChunks).map(async ([key, chunkData]) => {
        const [chunkX, chunkY] = key.split('_').map(Number);

        const chunkDoc = {
          chunkX,
          chunkY,
          tiles: chunkData.tiles,
          items: chunkData.items,
          lastUpdated: new Date()
        };

        await this.chunkModel.findOneAndUpdate(
          { chunkX, chunkY },
          chunkDoc,
          { upsert: true, new: true }
        );
      });

      await Promise.all(savePromises);
      console.log(`Сохранено ${Object.keys(this.loadedChunks).length} чанков в MongoDB`);
    } catch (error) {
      console.error('Ошибка сохранения чанков в MongoDB:', error);
    }
  }

  private async saveChunk(chunkX: number, chunkY: number) {
    try {
      const key = `${chunkX}_${chunkY}`;
      const chunkData = this.loadedChunks[key];
      if (!chunkData) return;

      const chunkDoc = {
        chunkX,
        chunkY,
        tiles: chunkData.tiles,
        items: chunkData.items,
        lastUpdated: new Date()
      };

      await this.chunkModel.findOneAndUpdate(
        { chunkX, chunkY },
        chunkDoc,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`Ошибка сохранения чанка ${chunkX}_${chunkY}:`, error);
    }
  }

  async generateMap(chunkX: number, chunkY: number): Promise<ChunkData> {
    const key = `${chunkX}_${chunkY}`;
    if (this.loadedChunks[key]) return this.loadedChunks[key];

    // Пытаемся загрузить из БД
    try {
      const chunkFromDb = await this.chunkModel.findOne({ chunkX, chunkY }).exec();
      if (chunkFromDb) {
        this.loadedChunks[key] = {
          tiles: chunkFromDb.tiles,
          items: chunkFromDb.items
        };
        return this.loadedChunks[key];
      }
    } catch (error) {
      console.error(`Ошибка загрузки чанка ${key} из MongoDB:`, error);
    }

    // Генерируем новый чанк
    const { map, items } = generateMap(chunkX, chunkY);

    const tiles = map.map(row => row.map(tile => ({ type: tile.type })));
    const serializedItems = items.map(i => ({ x: i.x, y: i.y, type: i.type }));

    const chunkData: ChunkData = { tiles, items: serializedItems };
    this.loadedChunks[key] = chunkData;

    await this.saveChunk(chunkX, chunkY);

    return chunkData;
  }

  async getChunk(chunkX: number, chunkY: number): Promise<ChunkData | null> {
    const key = `${chunkX}_${chunkY}`;
    return this.loadedChunks[key] ?? await this.generateMap(chunkX, chunkY);
  }

  async getChunksAround(cx: number, cy: number): Promise<Record<string, ChunkData>> {
    const chunks: Record<string, ChunkData> = {};

    const loadPromises = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const chunkX = cx + dx;
        const chunkY = cy + dy;
        const key = `${chunkX}_${chunkY}`;

        loadPromises.push(
          this.getChunk(chunkX, chunkY).then(chunk => {
            if (chunk) {
              chunks[key] = chunk;
            }
          })
        );
      }
    }

    await Promise.all(loadPromises);
    return chunks;
  }

  // Остальные методы остаются без изменений
  async addItemToMap(chunkX: number, chunkY: number, tileX: number, tileY: number, itemType: string): Promise<{ chunk: string, x: number, y: number, type: string } | null> {
    const key = `${chunkX}_${chunkY}`;
    const chunk = await this.getChunk(chunkX, chunkY);
    if (!chunk) return null;

    let tileXInChunk = tileX % this.CHUNK_SIZE_IN_TILES;
    let tileYInChunk = tileY % this.CHUNK_SIZE_IN_TILES;

    tileXInChunk = (tileXInChunk < 0 ? this.CHUNK_SIZE_IN_TILES + tileXInChunk : tileXInChunk);
    tileYInChunk = (tileYInChunk < 0 ? this.CHUNK_SIZE_IN_TILES + tileYInChunk : tileYInChunk);

    if (tileXInChunk + 1 <= this.CHUNK_SIZE_IN_TILES) {
      tileXInChunk = tileXInChunk + 1;
    } else if (tileYInChunk + 1 <= this.CHUNK_SIZE_IN_TILES) {
      tileYInChunk = tileYInChunk + 1;
    } else if (tileXInChunk - 1 >= 0) {
      tileXInChunk = tileXInChunk - 1;
    } else {
      tileYInChunk = tileYInChunk - 1;
    }

    const newItem = { x: tileXInChunk, y: tileYInChunk, type: itemType };
    chunk.items.push(newItem);

    await this.saveChunk(chunkX, chunkY);

    return {
      chunk: key,
      x: newItem.x,
      y: newItem.y,
      type: newItem.type
    };
  }

  async removeItem(chunkX: number, chunkY: number, itemX: number, itemY: number): Promise<{ type: string } | null> {
    const chunk = await this.getChunk(chunkX, chunkY);
    if (!chunk) return null;

    const index = chunk.items.findIndex(i => i.x === itemX && i.y === itemY);
    if (index >= 0) {
      const [removed] = chunk.items.splice(index, 1);
      await this.saveChunk(chunkX, chunkY);
      return { type: removed.type };
    }
    return null;
  }

  /**
  * Удалить чанк из базы данных
  */
  async deleteChunkFromDb(chunkX: number, chunkY: number): Promise<{ deletedCount: number }> {
    try {
      const result = await this.chunkModel.deleteOne({ chunkX, chunkY }).exec();
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error(`Ошибка удаления чанка ${chunkX}_${chunkY}:`, error);
      return { deletedCount: 0 };
    }
  }

  /**
  * Получить чанк напрямую из базы данных
  */
  async getChunkFromDb(chunkX: number, chunkY: number): Promise<ChunkData | null> {
    try {
      const chunk = await this.chunkModel.findOne({ chunkX, chunkY }).exec();
      return chunk ? { tiles: chunk.tiles, items: chunk.items } : null;
    } catch (error) {
      console.error(`Ошибка получения чанка ${chunkX}_${chunkY} из БД:`, error);
      return null;
    }
  }


  /**
   * Удалить чанк из кэша
   */
  removeFromCache(chunkX: number, chunkY: number): void {
    const key = `${chunkX}_${chunkY}`;
    delete this.loadedChunks[key];
  }

  /**
   * Получить статистику по чанкам в БД
   */
  async getChunkStats(): Promise<{ totalChunks: number; chunkDistribution: any }> {
    try {
      const totalChunks = await this.chunkModel.countDocuments().exec();

      // Группировка по координатам для анализа распределения
      const distribution = await this.chunkModel.aggregate([
        {
          $group: {
            _id: null,
            minX: { $min: '$chunkX' },
            maxX: { $max: '$chunkX' },
            minY: { $min: '$chunkY' },
            maxY: { $max: '$chunkY' },
            uniqueChunks: { $addToSet: { x: '$chunkX', y: '$chunkY' } }
          }
        }
      ]).exec();

      return {
        totalChunks,
        chunkDistribution: distribution[0] || {}
      };
    } catch (error) {
      console.error('Ошибка получения статистики чанков:', error);
      return { totalChunks: 0, chunkDistribution: {} };
    }
  }

  /**
   * Поиск чанков по критериям
   */
  async searchChunks(tileType?: string, itemType?: string, limit = 10): Promise<any[]> {
    try {
      const query: any = {};

      if (tileType) {
        query['tiles'] = { $elemMatch: { $elemMatch: { type: tileType } } };
      }

      if (itemType) {
        query['items.type'] = itemType;
      }

      const chunks = await this.chunkModel
        .find(query)
        .select('chunkX chunkY tiles items')
        .limit(limit)
        .exec();

      return chunks.map(chunk => ({
        chunkX: chunk.chunkX,
        chunkY: chunk.chunkY,
        tilesCount: chunk.tiles.length,
        itemsCount: chunk.items.length,
        hasTileType: tileType ? true : undefined,
        hasItemType: itemType ? true : undefined
      }));
    } catch (error) {
      console.error('Ошибка поиска чанков:', error);
      return [];
    }
  }

  /**
   * Получить статистику кэша
   */
  getCacheStats() {
    return {
      loadedChunksCount: Object.keys(this.loadedChunks).length,
      chunkKeys: Object.keys(this.loadedChunks)
    };
  }

  /**
   * Очистить кэш чанков
   */
  clearCache(): void {
    this.loadedChunks = {};
  }

}