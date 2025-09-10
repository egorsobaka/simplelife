import { Injectable } from '@nestjs/common';
import { MapService, ChunkData } from './map.service';
import { Server } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface Player {
  lastSaveTime: number;
  id: string;
  x: number;
  y: number;
  anim: string;
  socketId: string;
  inventory: string[];
  chunk?: any;
}

// Интерфейс для документа MongoDB
interface PlayerDocument {
  telegramId: string;
  x: number;
  y: number;
  anim: string;
  inventory: string[];
  lastChunk: {
    chunkX: number;
    chunkY: number;
    tileX: number;
    tileY: number;
  };
  lastUpdated: Date;
}


@Injectable()
export class GameService {
  private players: Record<string, Player> = {};
  private readonly MAX_SPEED = 1000; // px/sec
  private readonly TICK_INTERVAL = 50; // ms
  private itemSpawnInterval: NodeJS.Timeout;
  private server: Server;
  private socketToTelegram: Record<string, string> = {}; // маппинг socketId -> telegramId
  private readonly SAVE_INTERVAL = 1000 * 60; // Сохраняем каждую минуту

  constructor(
    private readonly mapService: MapService,
    @InjectModel('Player') private readonly playerModel: Model<PlayerDocument>
  ) { }

  async onModuleInit() {
    await this.loadAllPlayers();
    setInterval(() => {
      this.spawnRandomItems(10);
    }, 1000 * 3600);

    setInterval(() => {
      this.growTrees();
    }, 1000 * 3600 * 4);

    setInterval(() => {
      this.growStones();
    }, 1000 * 3600 * 8);
  }

  onModuleDestroy() {
    if (this.itemSpawnInterval) clearInterval(this.itemSpawnInterval);
    this.saveAllPlayers();
  }

  /**
   * Устанавливает ссылку на socket.io сервер из gateway.
   */
  setServer(server: Server) {
    this.server = server;
  }

  private async loadAllPlayers() {
    try {
      const playersFromDb = await this.playerModel.find().exec();

      playersFromDb.forEach(playerDoc => {
        this.players[playerDoc.telegramId] = {
          id: playerDoc.telegramId,
          x: playerDoc.x,
          y: playerDoc.y,
          anim: playerDoc.anim,
          socketId: '',
          inventory: playerDoc.inventory,
          chunk: playerDoc.lastChunk,
          lastSaveTime: 0,
        };
      });

      console.log(`Загружено ${playersFromDb.length} игроков из MongoDB`);
    } catch (error) {
      console.error('Ошибка загрузки игроков из MongoDB:', error);
    }
  }

  private async saveAllPlayers() {
    try {
      const savePromises = Object.values(this.players).map(async (player) => {
        if (!player.id) return;

        const playerData = {
          telegramId: player.id,
          x: player.x,
          y: player.y,
          anim: player.anim,
          inventory: player.inventory,
          lastChunk: player.chunk || { chunkX: 0, chunkY: 0, tileX: 0, tileY: 0 },
          lastUpdated: new Date()
        };

        await this.playerModel.findOneAndUpdate(
          { telegramId: player.id },
          playerData,
          { upsert: true, new: true }
        );
      });

      await Promise.all(savePromises);
      console.log(`Сохранено ${Object.keys(this.players).length} игроков в MongoDB`);
    } catch (error) {
      console.error('Ошибка сохранения игроков в MongoDB:', error);
    }
  }

  private async _savePlayer(telegramId: string) {
    try {
      const player = this.players[telegramId];
      if (!player) return;

      const playerData = {
        telegramId: player.id,
        x: player.x,
        y: player.y,
        anim: player.anim,
        inventory: player.inventory,
        lastChunk: player.chunk || { chunkX: 0, chunkY: 0, tileX: 0, tileY: 0 },
        lastUpdated: new Date()
      };

      await this.playerModel.findOneAndUpdate(
        { telegramId: player.id },
        playerData,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`Ошибка сохранения игрока ${telegramId}:`, error);
    }
  }

  /**
 * Добавляет нового игрока или возвращает уже существующего.
 */
  async addPlayer(socketId: string, telegramId: string) {
    if (this.players[telegramId]) {
      this.socketToTelegram[socketId] = telegramId;
      this.players[telegramId].socketId = socketId;

      await this.savePlayer(telegramId);

      return {
        x: this.players[telegramId].x,
        y: this.players[telegramId].y,
      };
    }

    let playerFromDb: PlayerDocument = null;
    try {
      playerFromDb = await this.playerModel.findOne({ telegramId }).exec();
    } catch (error) {
      console.error('Ошибка поиска игрока в MongoDB:', error);
    }

    if (playerFromDb) {
      // Восстанавливаем из БД
      this.socketToTelegram[socketId] = telegramId;
      this.players[telegramId] = {
        id: telegramId,
        socketId,
        x: playerFromDb.x,
        y: playerFromDb.y,
        anim: playerFromDb.anim,
        inventory: playerFromDb.inventory,
        chunk: playerFromDb.lastChunk,
        lastSaveTime: 0,
      };

      return { x: playerFromDb.x, y: playerFromDb.y };
    }


    const chunkX = 0;
    const chunkY = 0;
    const chunk = await this.mapService.getChunk(chunkX, chunkY);

    if (!chunk) {
      this.players[telegramId] = {
        id: telegramId,
        x: 100,
        y: 100,
        anim: "",
        inventory: [],
        socketId,
        chunk: { chunkX, chunkY },
        lastSaveTime: 0,
      };
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
      lastSaveTime: 0,
    };
    await this.savePlayer(telegramId);
    return { x: spawnX, y: spawnY };
  }

  /**
   * Удаляет игрока.
   */
  async removePlayer(socketId: string) {
    const telegramId = this.socketToTelegram[socketId];
    if (telegramId) {
      // Сохраняем перед удалением
      await this.savePlayer(telegramId);
      delete this.socketToTelegram[socketId];

      // Не удаляем из players, чтобы сохранить состояние
      // Просто удаляем socketId
      if (this.players[telegramId]) {
        this.players[telegramId].socketId = '';
      }
    }
  }

  /**
   * Возвращает данные игрока по ID.
   * Возвращает null, если игрок не найден.
   */
  getPlayer(id: string): Player | null {
    return this.players[this.socketToTelegram[id]] || null;
  }

  async updatePosition(id: string, x: number, y: number, anim: string) {
    const telegramId = this.socketToTelegram[id];
    const player = this.players[telegramId];
    if (!player) return;

    const dt = this.TICK_INTERVAL / 100;
    const maxStep = this.MAX_SPEED * dt;

    const dx = x - player.x;
    const dy = y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let newX = player.x;
    let newY = player.y;

    if (dist > maxStep) {
      const scale = maxStep / dist;
      newX += dx * scale;
      newY += dy * scale;
    } else {
      newX = x;
      newY = y;
    }

    // Проверка тайла на карте
    const tileX = Math.floor(newX / 32);
    const tileY = Math.floor(newY / 32);
    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    const chunk = await this.mapService.getChunk(chunkX, chunkY);

    if (chunk) {
      const tileInChunkX = tileX % 20;
      const tileInChunkY = tileY % 20;

      const tile = chunk.tiles[tileInChunkY]?.[tileInChunkX];
      if (tile && (tile.type === 'water' || tile.type === 'rock')) {
        // Тайл непроходимый — остаёмся на старой позиции
        newX = player.x;
        newY = player.y;
      }
    }

    player.x = newX;
    player.y = newY;
    player.anim = anim;

    player.chunk = { chunkX, chunkY, tileX, tileY };

    // Периодическое сохранение при движении (раз в 10 секунд)
    const now = Date.now();
    if (!player.lastSaveTime || now - player.lastSaveTime > 10000) {
      player.lastSaveTime = now;
      this.savePlayer(telegramId);
    }
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
  async getChunks(cx: number, cy: number): Promise<Record<string, ChunkData>> {
    return this.mapService.getChunksAround(cx, cy);
  }

  /**
   * Новый метод для выбрасывания предметов из инвентаря на карту.
   * Возвращает данные о выброшенном предмете или null.
   */
  async dropItem(id: string, itemType: string) {
    const telegramId = this.socketToTelegram[id];
    const player = this.players[telegramId];
    if (!player) return null;

    const itemIndex = player.inventory.indexOf(itemType);
    if (itemIndex === -1) {
      console.log(`Игрок ${player.id} не может выбросить ${itemType}, его нет в инвентаре ${player.x} ${player.y}`);
      return null;
    }

    player.inventory.splice(itemIndex, 1);

    await this.savePlayer(telegramId);

    let tileX = Math.floor((player.x) / 32);
    let tileY = Math.floor(player.y / 32);

    console.log("player tileX, tileY", tileX, tileY)

    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    const chunkKey = `${chunkX}_${chunkY}`;

    const addedItem = await this.mapService.addItemToMap(chunkX, chunkY, tileX, tileY, itemType);

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

  private async checkItemPickup(player: Player) {
    const tileX = Math.floor(player.x / 32);
    const tileY = Math.floor(player.y / 32);
    const chunkX = Math.floor(tileX / 20);
    const chunkY = Math.floor(tileY / 20);
    const chunkKey = `${chunkX}_${chunkY}`;

    const chunk = await this.mapService.getChunk(chunkX, chunkY);
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

      if (["woodItem", "rock", "iron_ore", "copper_ore", "gold_ore"].includes(item.type)) {
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

      this.savePlayer(player.id);
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

  async addItemToInventory(socketId: string, itemType: string, count: number) {
    const telegramId = this.socketToTelegram[socketId];
    if (!telegramId) return;

    const player = this.players[telegramId];
    if (!player) return;

    for (let i = 0; i < count; i++) {
      player.inventory.push(itemType);
    }

    await this.savePlayer(telegramId);

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

          if (tile?.type === "forest" && !occupied) {
            if (Math.random() < 0.1) {
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

  // В класс GameService добавьте следующие методы:

  /**
   * Получить всех игроков
   */
  getAllPlayers(): Record<string, Player> {
    return this.players;
  }

  /**
   * Получить игрока по telegramId
   */
  getPlayerByTelegramId(telegramId: string): Player | null {
    return this.players[telegramId] || null;
  }

  /**
   * Получить инвентарь игрока по telegramId
   */
  getPlayerInventoryByTelegramId(telegramId: string): Record<string, number> {
    const player = this.players[telegramId];
    if (!player) return {};

    const inv: Record<string, number> = {};
    player.inventory.forEach(item => {
      if (!inv[item]) inv[item] = 0;
      inv[item]++;
    });
    return inv;
  }

  /**
   * Сохранить игрока по telegramId
   */
  async savePlayer(telegramId: string): Promise<void> {
    await this._savePlayer(telegramId); // используем существующий метод
  }
}