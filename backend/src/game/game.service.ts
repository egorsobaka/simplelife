// game.service.ts
import { Injectable } from '@nestjs/common';
import { MapService, ChunkData } from './map.service';

interface Player {
  id: string;
  x: number;
  y: number;
}

@Injectable()
export class GameService {
  private players: Record<string, Player> = {};

  constructor(private readonly mapService: MapService) {}

  addPlayer(id: string) {
    this.players[id] = { id, x: 100, y: 100 };
  }

  removePlayer(id: string) {
    delete this.players[id];
  }

  updatePosition(id: string, x: number, y: number) {
    const player = this.players[id];
    if (!player) return;
    player.x = x;
    player.y = y;
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
