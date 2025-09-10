// chunk.controller.ts
import { Controller, Post, Delete, Get, Param, Query } from '@nestjs/common';
import { MapService } from './map.service';

@Controller('map')
export class ChunkController {
  constructor(private readonly mapService: MapService) {}

  /**
   * Очистить кэш чанков
   */
  @Post('clear-cache')
  async clearCache() {
    this.mapService.clearCache();
    return { message: 'Кэш чанков очищен' };
  }

  /**
   * Перегенерировать конкретный чанк
   */
  @Post('regenerate/:chunkX/:chunkY')
  async regenerateChunk(
    @Param('chunkX') chunkX: number,
    @Param('chunkY') chunkY: number
  ) {
    const key = `${chunkX}_${chunkY}`;
    
    // Удаляем чанк из БД
    await this.mapService.deleteChunkFromDb(chunkX, chunkY);
    
    // Очищаем из кэша
    this.mapService.removeFromCache(chunkX, chunkY);
    
    // Генерируем заново
    const chunk = await this.mapService.generateMap(chunkX, chunkY);
    
    return { 
      message: `Чанк ${key} перегенерирован`,
      chunk 
    };
  }

  /**
   * Перегенерировать все чанки в области
   */
  @Post('regenerate-area')
  async regenerateArea(
    @Query('minX') minX: number,
    @Query('maxX') maxX: number,
    @Query('minY') minY: number,
    @Query('maxY') maxY: number
  ) {
    const results = [];
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        await this.mapService.deleteChunkFromDb(x, y);
        this.mapService.removeFromCache(x, y);
        const chunk = await this.mapService.generateMap(x, y);
        results.push({ x, y, status: 'regenerated' });
      }
    }
    
    return { 
      message: `Перегенерирована область: X[${minX}-${maxX}], Y[${minY}-${maxY}]`,
      results 
    };
  }

  /**
   * Удалить чанк из БД
   */
  @Delete('chunk/:chunkX/:chunkY')
  async deleteChunk(
    @Param('chunkX') chunkX: number,
    @Param('chunkY') chunkY: number
  ) {
    const result = await this.mapService.deleteChunkFromDb(chunkX, chunkY);
    this.mapService.removeFromCache(chunkX, chunkY);
    
    return { 
      message: `Чанк ${chunkX}_${chunkY} удален`,
      deletedCount: result.deletedCount 
    };
  }

  /**
   * Получить информацию о чанке
   */
  @Get('chunk/:chunkX/:chunkY')
  async getChunkInfo(
    @Param('chunkX') chunkX: number,
    @Param('chunkY') chunkY: number
  ) {
    const chunk = await this.mapService.getChunk(chunkX, chunkY);
    const fromDb = await this.mapService.getChunkFromDb(chunkX, chunkY);
    
    return {
      chunkX,
      chunkY,
      inCache: !!chunk,
      inDatabase: !!fromDb,
      tiles: chunk ? chunk.tiles.length : 0,
      items: chunk ? chunk.items.length : 0
    };
  }

  /**
   * Получить статистику по чанкам
   */
  @Get('stats')
  async getStats() {
    const stats = await this.mapService.getChunkStats();
    const cacheStats = this.mapService.getCacheStats();
    
    return {
      database: stats,
      cache: cacheStats,
      totalChunks: stats.totalChunks + cacheStats.loadedChunksCount
    };
  }

  /**
   * Поиск чанков по критериям
   */
  @Get('search')
  async searchChunks(
    @Query('tileType') tileType?: string,
    @Query('itemType') itemType?: string,
    @Query('limit') limit = 10
  ) {
    return this.mapService.searchChunks(tileType, itemType, limit);
  }
}