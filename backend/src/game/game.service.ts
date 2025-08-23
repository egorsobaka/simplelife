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
  private itemSpawnInterval: NodeJS.Timeout;
  private server: Server;

  constructor(private readonly mapService: MapService) { }

  onModuleInit() {
    // каждые 100 секунд добавляем 100 предметов
    setInterval(() => {
      this.spawnRandomItems(10);
    }, 100000);

    // каждые 30 секунд проверяем рост деревьев
    setInterval(() => {
      this.growTrees();
    }, 60000);
  }


  onModuleDestroy() {
    if (this.itemSpawnInterval) clearInterval(this.itemSpawnInterval);
  }
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

  private spawnTreeInChunk(chunk: ChunkData, chunkKey: string, x: number, y: number) {
    const tile = chunk.tiles[y]?.[x];
    if (!tile || tile.type !== "grass") return false;

    const neighbors = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    const existingTrees = chunk.items.filter(item => item.type === 'tree');

    let canSpawnTree = false;
    for (const tree of existingTrees) {
      for (const n of neighbors) {
        const nx = tree.x + n.dx;
        const ny = tree.y + n.dy;
        if (nx === x && ny === y) {
          canSpawnTree = true;
          break;
        }
      }
      if (canSpawnTree) break;
    }

    if (canSpawnTree) {
      chunk.items.push({ x, y, type: "tree" });
      this.server?.emit("itemAdded", { chunk: chunkKey, x, y, type: "tree" });
      return true;
    }

    return false;
  }

  private spawnRandomItems(count: number) {
    const chunkKeys = Object.keys(this.mapService['loadedChunks']);
    if (!chunkKeys.length) return;

    for (let i = 0; i < count; i++) {
      const chunkKey = chunkKeys[Math.floor(Math.random() * chunkKeys.length)];
      const chunk = this.mapService['loadedChunks'][chunkKey];

      const x = Math.floor(Math.random() * 20);
      const y = Math.floor(Math.random() * 20);

      const tile = chunk.tiles[y]?.[x];
      const occupied = chunk.items.some(i => i.x === x && i.y === y);
      if (!tile || tile.type !== "grass" || occupied) continue;

      const types = ['woodItem', 'stoneItem', 'eggItem'];
      const type = types[Math.floor(Math.random() * types.length)];

      chunk.items.push({ x, y, type });
      this.server?.emit("itemAdded", { chunk: chunkKey, x, y, type });
    }

    console.log(`Добавлено ${count} предметов на карту`);
  }


  private growTrees() {
    const chunkKeys = Object.keys(this.mapService['loadedChunks']);
    if (!chunkKeys.length) return;

    for (const chunkKey of chunkKeys) {
      const chunk = this.mapService['loadedChunks'][chunkKey];

      // все деревья в чанке
      let trees = chunk.items.filter(i => i.type === "woodItem");

      if (!trees.length) continue;

      // перемешиваем массив Фишера–Йетса
      for (let i = trees.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trees[i], trees[j]] = [trees[j], trees[i]];
      }

      // выбираем случайную часть (например, до половины деревьев)
      const count = Math.floor(trees.length * (0.3 + Math.random() * 0.2));
      trees = trees.slice(0, count);

      for (const tree of trees) {
        const neighbors = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ];

        for (const n of neighbors) {
          const nx = tree.x + n.dx;
          const ny = tree.y + n.dy;

          if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) continue;

          const tile = chunk.tiles[ny]?.[nx];
          const occupied = chunk.items.some(i => i.x === nx && i.y === ny);

          if (tile?.type === "grass" && !occupied) {
            if (Math.random() < 0.3) {
              chunk.items.push({ x: nx, y: ny, type: "woodItem" });
              this.server?.emit("itemAdded", {
                chunk: chunkKey,
                x: nx,
                y: ny,
                type: "woodItem",
              });
            }
          }
        }
      }
    }

    console.log("Деревья проверены на рост");
  }



}
