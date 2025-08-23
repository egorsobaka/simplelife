import { Injectable } from '@nestjs/common';
import { MapService, ChunkData } from './map.service';
import { Server } from 'socket.io';

interface Player {
  id: string;
  x: number;
  y: number;
  anim: string;
  inventory: string[];
}

@Injectable()
export class GameService {
  private players: Record<string, Player> = {};
  private readonly MAX_SPEED = 200; // px/sec
  private readonly TICK_INTERVAL = 50; // ms

  private server: Server;

  constructor(private readonly mapService: MapService) { }

  /**
   * сетим ссылку на socket.io сервер из gateway
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
   * добавление игрока
   */
  addPlayer(id: string) {
    this.players[id] = { id, x: 100, y: 100, anim: "", inventory: [] };
  }

  /**
   * удаление игрока
   */
  removePlayer(id: string) {
    delete this.players[id];
  }

  /**
   * обновление позиции игрока с ограничением скорости
   */
  updatePosition(id: string, x: number, y: number, anim: string) {
    const player = this.players[id];
    if (!player) return;

    const dt = this.TICK_INTERVAL / 1000;
    const maxStep = this.MAX_SPEED * dt;

    const dx = x - player.x;
    const dy = y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxStep) {
      const scale = maxStep / dist;
      player.x += dx * scale;
      player.y += dy * scale;
    } else {
      player.x = x;
      player.y = y;
    }

    player.anim = anim;

    this.checkItemPickup(player);
  }

  /**
   * возвращаем снимок состояния игры
   */
  getSnapshot() {
    return { players: this.players };
  }

  /**
   * загрузка чанков вокруг игрока
   */
  getChunks(cx: number, cy: number): Record<string, ChunkData> {
    return this.mapService.getChunksAround(cx, cy);
  }

  private checkItemPickup(player: Player) {
    const tileX = Math.floor(player.x / 32);
    const tileY = Math.floor(player.y / 32);
    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    const chunkKey = `${chunkX}_${chunkY}`;

    const chunk = this.mapService.getChunk(chunkX, chunkY);
    if (!chunk) return;

    const pickupRadius = 20; // пиксели

    const foundIndex = chunk.items.findIndex(item => {
      // глобальные координаты предмета
      const globalX = (item.x + chunkX * 20) * 32 + 16;
      const globalY = (item.y + chunkY * 20) * 32 + 16;

      // расстояние между игроком и предметом
      const dist = Math.hypot(player.x - globalX, player.y - globalY);

      return dist < pickupRadius;
    });

    if (foundIndex >= 0) {
      const item = chunk.items[foundIndex];

      // добавить в инвентарь игроку
      player.inventory.push(item.type);

      // удалить с карты
      chunk.items.splice(foundIndex, 1);

      console.log(`Игрок ${player.id} поднял ${item.type}`);

      // уведомляем только игрока
      this.server.to(player.id).emit("itemPicked", {
        type: item.type,
        x: item.x,
        y: item.y,
      });

      // уведомляем остальных игроков о том, что предмет исчез
      this.server.emit("itemRemoved", {
        chunk: chunkKey,
        x: item.x,
        y: item.y,
      });
    }
  }


}
