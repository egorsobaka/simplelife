// player.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { GameService } from './game.service';

interface PlayerResponse {
  id: string;
  x: number;
  y: number;
  anim: string;
  socketId: string;
  inventory: string[];
  chunk?: any;
}

@Controller('players')
export class PlayerController {
  constructor(private readonly gameService: GameService) {}

  /**
   * Получить информацию обо всех игроках
   */
  @Get()
  async getAllPlayers(): Promise<{ count: number; players: Record<string, PlayerResponse> }> {
    const players = this.gameService.getAllPlayers();
    
    // Преобразуем игроков в безопасный формат для ответа
    const playersResponse: Record<string, PlayerResponse> = {};
    for (const [telegramId, player] of Object.entries(players)) {
      playersResponse[telegramId] = this.mapPlayerToResponse(player);
    }

    return {
      count: Object.keys(players).length,
      players: playersResponse
    };
  }

  /**
   * Получить информацию о конкретном игроке
   */
  @Get(':telegramId')
  async getPlayer(@Param('telegramId') telegramId: string): Promise<PlayerResponse | { error: string }> {
    const player = this.gameService.getPlayerByTelegramId(telegramId);
    if (!player) {
      return { error: 'Player not found' };
    }
    return this.mapPlayerToResponse(player);
  }

  /**
   * Получить инвентарь игрока
   */
  @Get(':telegramId/inventory')
  async getPlayerInventory(@Param('telegramId') telegramId: string): Promise<any> {
    const player = this.gameService.getPlayerByTelegramId(telegramId);
    if (!player) {
      return { error: 'Player not found' };
    }
    
    const inventory = this.gameService.getPlayerInventoryByTelegramId(telegramId);
    return {
      telegramId,
      inventory,
      totalItems: player.inventory.length
    };
  }

  /**
   * Установить координаты игрока
   */
  @Post(':telegramId/position')
  async setPlayerPosition(
    @Param('telegramId') telegramId: string,
    @Body() positionData: { x: number; y: number; anim?: string }
  ) {
    const player = this.gameService.getPlayerByTelegramId(telegramId);
    if (!player) {
      return { error: 'Player not found' };
    }

    // Обновляем позицию
    player.x = positionData.x;
    player.y = positionData.y;
    if (positionData.anim) {
      player.anim = positionData.anim;
    }

    // Сохраняем изменения
    await this.gameService.savePlayer(telegramId);

    return {
      success: true,
      message: 'Position updated',
      player: {
        telegramId,
        x: player.x,
        y: player.y,
        anim: player.anim
      }
    };
  }

  /**
   * Телепортировать игрока в конкретные координаты
   */
  @Post(':telegramId/teleport')
  async teleportPlayer(
    @Param('telegramId') telegramId: string,
    @Body() teleportData: { x: number; y: number; chunkX?: number; chunkY?: number }
  ) {
    const player = this.gameService.getPlayerByTelegramId(telegramId);
    if (!player) {
      return { error: 'Player not found' };
    }

    // Обновляем позицию и чанк
    player.x = teleportData.x;
    player.y = teleportData.y;
    
    if (teleportData.chunkX !== undefined && teleportData.chunkY !== undefined) {
      player.chunk = {
        chunkX: teleportData.chunkX,
        chunkY: teleportData.chunkY,
        tileX: Math.floor(teleportData.x / 32),
        tileY: Math.floor(teleportData.y / 32)
      };
    }

    // Сохраняем изменения
    await this.gameService.savePlayer(telegramId);

    return {
      success: true,
      message: 'Player teleported',
      position: {
        x: player.x,
        y: player.y,
        chunk: player.chunk
      }
    };
  }

  /**
   * Получить игроков в определенном чанке
   */
  @Get('chunk/:chunkX/:chunkY')
  async getPlayersInChunk(
    @Param('chunkX') chunkX: number,
    @Param('chunkY') chunkY: number
  ) {
    const players = this.gameService.getAllPlayers();
    const playersInChunk = Object.values(players).filter(player => 
      player.chunk && player.chunk.chunkX === chunkX && player.chunk.chunkY === chunkY
    );

    return {
      chunk: { chunkX, chunkY },
      count: playersInChunk.length,
      players: playersInChunk.map(p => ({
        telegramId: p.id,
        x: p.x,
        y: p.y,
        anim: p.anim,
        inventoryCount: p.inventory.length
      }))
    };
  }

  // Вспомогательная функция для преобразования игрока в ответ
  private mapPlayerToResponse(player: any): PlayerResponse {
    return {
      id: player.id,
      x: player.x,
      y: player.y,
      anim: player.anim,
      socketId: player.socketId,
      inventory: [...player.inventory], // копируем массив
      chunk: player.chunk ? { ...player.chunk } : undefined
    };
  }

  // Вспомогательная функция для группировки игроков по чанкам
  private getPlayersByChunk(players: Record<string, any>) {
    const chunks: Record<string, number> = {};
    
    Object.values(players).forEach(player => {
      if (player.chunk) {
        const chunkKey = `${player.chunk.chunkX}_${player.chunk.chunkY}`;
        chunks[chunkKey] = (chunks[chunkKey] || 0) + 1;
      }
    });

    return chunks;
  }
}