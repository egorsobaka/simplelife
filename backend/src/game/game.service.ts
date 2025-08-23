import { Injectable } from '@nestjs/common';
import { MapService, ChunkData } from './map.service';

interface Player {
  id: string;
  x: number;
  y: number;
  anim: string;
}

@Injectable()
export class GameService {
  private players: Record<string, Player> = {};
  private readonly MAX_SPEED = 200; // px/sec
  private readonly TICK_INTERVAL = 50; // ms, если используешь setInterval на сервере

  constructor(private readonly mapService: MapService) {}

  addPlayer(id: string) {
    this.players[id] = { id, x: 100, y: 100, anim: "" };
  }

  removePlayer(id: string) {
    delete this.players[id];
  }

  updatePosition(id: string, x: number, y: number, anim: string) {
    const player = this.players[id];
    if (!player) return;

    // вычисляем максимальное смещение за тик
    const dt = this.TICK_INTERVAL / 1000; // в секундах
    const maxStep = this.MAX_SPEED * dt;

    // разница между текущей и новой позицией
    const dx = x - player.x;
    const dy = y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxStep) {
      // ограничиваем движение по вектору
      const scale = maxStep / dist;
      player.x += dx * scale;
      player.y += dy * scale;
    } else {
      player.x = x;
      player.y = y;
    }

    player.anim = anim;
  }

  getSnapshot() {
    return {
      players: this.players,
    };
  }

  getChunks(cx: number, cy: number): Record<string, ChunkData> {
    return this.mapService.getChunksAround(cx, cy);
  }
}
