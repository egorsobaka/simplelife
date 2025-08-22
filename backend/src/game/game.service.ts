import { Injectable } from '@nestjs/common';
import { TelegramService } from './telegram.service';

interface Player {
  id: string;
  x: number;
  y: number;
  lastNotification: number;
  telegramId: string;
}

@Injectable()
export class GameService {
  private players: Record<string, Player> = {};

  constructor(private readonly telegramService: TelegramService) {}

  addPlayer(id: string, telegramId: string) {
    this.players[id] = { id, x: 100, y: 100, lastNotification: 0, telegramId };
  }

  removePlayer(id: string) {
    delete this.players[id];
  }

  updatePosition(id: string, x: number, y: number) {
    const player = this.players[id];
    if (!player) return;
    player.x = x;
    player.y = y;
    this.checkMeetings(player);
  }

  getSnapshot() {
    return this.players;
  }

  private checkMeetings(player: Player) {
    const now = Date.now();
    Object.values(this.players).forEach(other => {
      if (other.id === player.id) return;
      const dist = Math.hypot(player.x - other.x, player.y - other.y);
      if (dist < 50 && now - Math.max(player.lastNotification, other.lastNotification) > 60000) {
        this.telegramService.notifyPlayers(player.telegramId, other.telegramId);
        player.lastNotification = now;
        other.lastNotification = now;
      }
    });
  }
}
