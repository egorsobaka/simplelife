import { Injectable } from '@nestjs/common';
import { MapService, ChunkData } from './map.service';
import { Server } from 'socket.io';

interface Player {
  id: string;
  x: number;
  y: number;
  anim: string;
  socketId: string;
  inventory: string[];
  chunk?: any;
}

@Injectable()
export class GameService {
  private players: Record<string, Player> = {};
  private readonly MAX_SPEED = 1000; // px/sec
  private readonly TICK_INTERVAL = 50; // ms
  private itemSpawnInterval: NodeJS.Timeout;
  private server: Server;
  private socketToTelegram: Record<string, string> = {}; // маппинг socketId -> telegramId

  constructor(private readonly mapService: MapService) { }

  onModuleInit() {
    setInterval(() => {
      this.spawnRandomItems(10);
    }, 1000 * 3600);

    setInterval(() => {
      this.growTrees();
    }, 1000 * 3600 / 4);

    setInterval(() => {
      this.growStones();
    }, 1000 * 3600 / 2);
  }

  onModuleDestroy() {
    if (this.itemSpawnInterval) clearInterval(this.itemSpawnInterval);
  }

  /**
   * Устанавливает ссылку на socket.io сервер из gateway.
   */
  setServer(server: Server) {
    this.server = server;
  }

  /**
 * Добавляет нового игрока или возвращает уже существующего.
 */
  addPlayer(socketId: string, telegramId: string) {
    if (this.players[telegramId]) {
      this.socketToTelegram[socketId] = telegramId;
      this.players[telegramId].socketId = socketId;
      return {
        x: this.players[telegramId].x,
        y: this.players[telegramId].y,
      };
    }

    const chunkX = 0;
    const chunkY = 0;
    const chunk = this.mapService.getChunk(chunkX, chunkY);

    if (!chunk) {
      this.players[telegramId] = { id: telegramId, x: 100, y: 100, anim: "", inventory: [], socketId, chunk: { chunkX, chunkY } };
      return { x: 100, y: 100 };
    }

    let spawnX = 0;
    let spawnY = 0;
    let found = false;

    for (let y = 0; y < chunk.tiles.length; y++) {
      for (let x = 0; x < chunk.tiles[y].length; x++) {
        const tile = chunk.tiles[y][x];
        if (tile?.type === "grass") {
          spawnX = (chunkX * 20 + x) * 32 + 16; // переводим в глобальные координаты пикселей
          spawnY = (chunkY * 20 + y) * 32 + 16;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      spawnX = 100;
      spawnY = 100;
    }

    this.socketToTelegram[socketId] = telegramId;
    this.players[telegramId] = {
      id: telegramId,
      socketId,
      x: spawnX,
      y: spawnY,
      anim: "",
      inventory: [],
      chunk: { chunkX, chunkY },
    };
    return { x: spawnX, y: spawnY };
  }

  /**
   * Удаляет игрока.
   */
  removePlayer(id: string) {
    delete this.socketToTelegram[id];
  }

  /**
   * Возвращает данные игрока по ID.
   * Возвращает null, если игрок не найден.
   */
  getPlayer(id: string): Player | null {
    return this.players[this.socketToTelegram[id]] || null;
  }

  /**
   * Обновляет позицию игрока с ограничением скорости.
   */
  updatePosition(id: string, x: number, y: number, anim: string) {
    const player = this.players[this.socketToTelegram[id]];
    if (!player) return;

    const dt = this.TICK_INTERVAL / 100;
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

    const tileX = Math.floor((player.x) / 32);
    const tileY = Math.floor(player.y / 32);
    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    player.chunk = { chunkX, chunkY, tileX, tileY }
    this.checkItemPickup(player);
  }

  /**
   * Возвращает снимок состояния игры.
   */
  getSnapshot() {
    return { players: this.players };
  }

  /**
   * Загружает чанки вокруг игрока.
   */
  getChunks(cx: number, cy: number): Record<string, ChunkData> {
    return this.mapService.getChunksAround(cx, cy);
  }

  /**
   * Новый метод для выбрасывания предметов из инвентаря на карту.
   * Возвращает данные о выброшенном предмете или null.
   */
  dropItem(id: string, itemType: string) {
    const player = this.players[this.socketToTelegram[id]];
    if (!player) return null;

    const itemIndex = player.inventory.indexOf(itemType);
    if (itemIndex === -1) {
      console.log(`Игрок ${player.id} не может выбросить ${itemType}, его нет в инвентаре ${player.x} ${player.y}`);
      return null;
    }

    player.inventory.splice(itemIndex, 1);

    let tileX = Math.floor((player.x) / 32);
    let tileY = Math.floor(player.y / 32);

    console.log("player tileX, tileY", tileX, tileY)

    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    const chunkKey = `${chunkX}_${chunkY}`;

    const addedItem = this.mapService.addItemToMap(chunkX, chunkY, tileX, tileY, itemType);

    if (addedItem) {
      console.log(`Игрок ${player.id}  ${player.x} ${player.y} выбросил ${itemType} в чанке ${chunkKey} на координатах ${addedItem.x}, ${addedItem.y} addedItem.chunk ${addedItem.chunk}`);
      return {
        chunk: addedItem.chunk,
        x: addedItem.x,
        y: addedItem.y,
        type: addedItem.type,
      };
    }

    return null;
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
      const globalX = (item.x + chunkX * 20) * 32 + 16;
      const globalY = (item.y + chunkY * 20) * 32 + 16;
      const dist = Math.hypot(player.x - globalX, player.y - globalY);
      return dist < pickupRadius;
    });

    if (foundIndex >= 0) {
      const item = chunk.items[foundIndex];

      if (["woodItem"].includes(item.type)) {
        return;
      }

      player.inventory.push(item.type);

      chunk.items.splice(foundIndex, 1);

      console.log(`Игрок ${player.socketId} поднял ${item.type}`);

      const itemsMap = {
        "woodItem": "wood",
      }

      this.server.to(player.socketId).emit("itemPicked", {
        type: itemsMap[item.type] || item.type,
        x: item.x,
        y: item.y,
      });

      this.server.emit("itemRemoved", {
        chunk: chunkKey,
        x: item.x,
        y: item.y,
      });
    }
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

  addItemToInventory(socketId: string, itemType: string, count: number) {
    const telegramId = this.socketToTelegram[socketId];
    if (!telegramId) return;

    const player = this.players[telegramId];
    if (!player) return;

    for (let i = 0; i < count; i++) {
      player.inventory.push(itemType);
    }

    // Можно сразу уведомить игрока
    this.server.to(socketId).emit('inventoryUpdated', {
      inventory: this.getPlayerInventory(socketId),
    });
  }

  /**
   * Возвращает инвентарь игрока в виде объекта с количеством каждого предмета.
   */
  getPlayerInventory(socketId: string): Record<string, number> {
    const telegramId = this.socketToTelegram[socketId];
    if (!telegramId) return {};

    const player = this.players[telegramId];
    if (!player) return {};

    const inv: Record<string, number> = {};
    player.inventory.forEach(item => {
      if (!inv[item]) inv[item] = 0;
      inv[item]++;
    });
    return inv;
  }

  private growTrees() {
    const chunkKeys = Object.keys(this.mapService['loadedChunks']);
    if (!chunkKeys.length) return;

    for (const chunkKey of chunkKeys) {
      const chunk = this.mapService['loadedChunks'][chunkKey];
      let trees = chunk.items.filter(i => i.type === "woodItem");

      if (!trees.length) continue;

      for (let i = trees.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [trees[i], trees[j]] = [trees[j], trees[i]];
      }

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

  private growStones() {
    const chunkKeys = Object.keys(this.mapService['loadedChunks']);
    if (!chunkKeys.length) return;

    for (const chunkKey of chunkKeys) {
      const chunk = this.mapService['loadedChunks'][chunkKey];
      let stones = chunk.items.filter(i => i.type === "stoneItem");

      if (!stones.length) continue;

      for (let i = stones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stones[i], stones[j]] = [stones[j], stones[i]];
      }

      const count = Math.floor(stones.length * (0.3 + Math.random() * 0.2));
      stones = stones.slice(0, count);

      for (const stone of stones) {
        const neighbors = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ];

        for (const n of neighbors) {
          const nx = stone.x + n.dx;
          const ny = stone.y + n.dy;

          if (nx < 0 || nx >= 20 || ny < 0 || ny >= 20) continue;

          const tile = chunk.tiles[ny]?.[nx];
          const occupied = chunk.items.some(i => i.x === nx && i.y === ny);

          if (tile?.type === "stone" && !occupied) {
            if (Math.random() < 0.3) {
              chunk.items.push({ x: nx, y: ny, type: "stoneItem" });
              this.server?.emit("itemAdded", {
                chunk: chunkKey,
                x: nx,
                y: ny,
                type: "stoneItem",
              });
            }
          }
        }
      }
    }
    console.log("Деревья проверены на рост");
  }
}