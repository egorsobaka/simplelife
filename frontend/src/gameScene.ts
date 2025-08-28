import Phaser from "phaser";
import { player, createPlayer, createAnimations, PLAYER_WIDTH, PLAYER_HEIGHT, type SmoothSprite } from "./playerController";
import { createHUD } from "./hud";
import { createMinimap, drawMinimap } from "./minimap";
import { loadChunkFromServer, unloadFarChunks, CHUNK_SIZE, loadedChunks, removeItemFromChunk, getItemFrame } from "./chunkManager";
import { handleMovementJoystick } from "./movementHelper.js";
import { initSocket, socket } from "./socket";
import { InventoryScene } from "./inventoryScene";
import { fetchCraftableItems } from "./craftingAPI.js";
import { TILE_SIZE } from "./mapGenerator.js";
declare global {
  interface Window {
    Telegram?: any;
  }
}

let currentChunkX = 0;
let currentChunkY = 0;
let otherPlayers: Record<string, SmoothSprite> = {};
let lastMoveSent = 0;
const MOVE_THROTTLE = 100;

const mobileDir = { x: 0, y: 0 };

const getUserId = () => {

  const tg = window?.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  if (user) {
    return {
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      initData: tg?.initData
    };
  }

  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = "guest_" + Date.now();
    localStorage.setItem("userId", userId);
  }
  return {
    userId,
    username: userId,
    firstName: userId,
    initData: null
  };
}

class GameScene extends Phaser.Scene {
  joystickBase!: Phaser.GameObjects.Arc;
  joystickThumb!: Phaser.GameObjects.Arc;
  messagesContainer!: Phaser.GameObjects.Container;
  messages: Phaser.GameObjects.Text[] = [];
  messagesVisible = true;
  inventory: { [key: string]: number } = {};
  chopZone!: Phaser.GameObjects.Rectangle;
  chopBuffer: { tileX: number; tileY: number; count: number }[] = [];

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", { frameWidth: 96, frameHeight: 128 });
    this.load.spritesheet("items", "/items-sprite-1.png.png", { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    createHUD(this);
    createMinimap(this);

    this.scene.add("InventoryScene", InventoryScene);
    this.createJoystick();
    this.createMessageWindow();
    this.createMessageToggleKey();
    this.createInventoryButton();
    this.createCraftButton();
    this.createChopZone();
    this.initSocket();
  }

  createCraftButton() {
    const craftButton = this.add.text(
      this.scale.width - 10,
      60,
      "⚒️ Крафт",
      { fontSize: "24px", backgroundColor: "#333", padding: { x: 10, y: 5 } }
    )
      .setScrollFactor(0)
      .setInteractive()
      .setOrigin(1, 0)
      .setDepth(1000);

    craftButton.on("pointerdown", async () => {
      const craftableItems = await fetchCraftableItems(this.inventory, Object.keys(this.inventory));
      this.showCraftingGrid(craftableItems);
    });
  }

  // метод для отображения грида крафтинга
  showCraftingGrid(craftableItems: any[]) {
    const cols = 5; // количество колонок
    const spriteSize = 48;
    const padding = 10;
    const startX = 100;
    const startY = 200;

    // фильтруем только то, что реально крафтится
    const craftables = craftableItems.filter(item => item.craftable);

    // фон для окна
    const bgWidth = cols * (spriteSize + padding) + padding;
    const rows = Math.ceil(craftables.length / cols);
    const bgHeight = rows * (spriteSize + padding + 24) + padding + 40; // +24 для текста, +40 для заголовка

    const bg = this.add.rectangle(
      startX + bgWidth / 2 - spriteSize / 2,
      startY + bgHeight / 2 - spriteSize / 2,
      bgWidth,
      bgHeight,
      0x000000,
      0.8
    )
      .setScrollFactor(0)
      .setDepth(1999);

    // группа для спрайтов и текста
    const gridGroup = this.add.group();

    // заголовок окна
    const title = this.add.text(
      startX + bgWidth / 2 - spriteSize / 2,
      startY + 10,
      "Крафтинг",
      { fontSize: "20px", color: "#fff", fontStyle: "bold" }
    )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2000);

    // крестик для закрытия
    const closeButton = this.add.text(
      startX + bgWidth - 10,
      startY + 10,
      "✖",
      { fontSize: "20px", color: "#fff" }
    )
      .setOrigin(1, 0)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(2000);

    closeButton.on("pointerdown", () => {
      gridGroup.clear(true, true);
      bg.destroy();
      title.destroy();
      closeButton.destroy();
    });

    craftables.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + padding + col * (spriteSize + padding);
      const y = startY + 40 + row * (spriteSize + padding + 24); // +40 для заголовка

      // берём фрейм по типу предмета
      const frame = getItemFrame(item.name);

      const sprite = this.add.sprite(x, y, "items", frame)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(2000)
        .setScale(1.2);

      // подпись под предметом
      const label = this.add.text(x, y + spriteSize / 2 + 8, item.title, {
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "rgba(0,0,0,0.6)",
        padding: { x: 4, y: 2 }
      })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(2000);

      // обработка клика по предмету
      sprite.on("pointerdown", async () => {
        try {
          const tg = (window as any).Telegram?.WebApp;

          const response = await fetch(`${import.meta.env.VITE_SOCKET_URL}api/crafting/craft`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemName: item.name,
              inventory: this.inventory,
              ownedItems: Object.keys(this.inventory),
              initData: tg?.initData,
            }),
          });
          const result = await response.json();

          if (result.success) {
            this.addMessage(`✅ Создан предмет: ${item.title}`);
            gridGroup.clear(true, true);
            bg.destroy();
            title.destroy();
            closeButton.destroy();
          } else {
            this.addMessage(`❌ Не удалось скрафтить: ${item.title}`);
          }
        } catch (e) {
          console.error(e);
          this.addMessage(`⚠️ Ошибка при крафте: ${item.title}`);
        }
      });

      gridGroup.addMultiple([sprite, label]);
    });
  }

  update() {
    if (!player) return;
    const dt = this.game.loop.delta / 1000;
    const maxSpeed = 100;

    const { isMove, newX, newY, anim } = handleMovementJoystick(mobileDir.x, mobileDir.y, maxSpeed, dt);

    if (isMove) {
      player.x = newX;
      player.y = newY;
      if (anim && player.anims.currentAnim?.key !== anim) player.play(anim, true);
    } else {
      player.anims.stop();
    }

    const now = performance.now();
    if (isMove && socket && now - lastMoveSent > MOVE_THROTTLE) {
      socket.emit("move", { x: player.x, y: player.y, anim });
      lastMoveSent = now;
    }

    // if (player.targetX !== undefined && player.targetY !== undefined) {
    //   const dx = player.targetX - player.x;
    //   const dy = player.targetY - player.y;
    //   const dist = Math.sqrt(dx * dx + dy * dy);
    //   const threshold = 10;
    //   const correctionSpeed = 100;
    //   if (dist > threshold) {
    //     const step = correctionSpeed * dt;
    //     player.x += dx / dist * Math.min(step, dist);
    //     player.y += dy / dist * Math.min(step, dist);
    //   }
    // }

    const smoothMove = (sprite: SmoothSprite) => {
      if (sprite.targetX === undefined || sprite.targetY === undefined) return;
      const dx = sprite.targetX - sprite.x;
      const dy = sprite.targetY - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) return;
      const step = 200 * dt;
      sprite.x += dx / dist * Math.min(step, dist);
      sprite.y += dy / dist * Math.min(step, dist);
    };

    for (const id in otherPlayers) smoothMove(otherPlayers[id]);

    this.checkChunkChange();
    drawMinimap([], Object.values(otherPlayers));
  }

  checkChunkChange() {
    if (!player || !socket) return;
    const newChunkX = Math.floor(player.x / (CHUNK_SIZE * 32));
    const newChunkY = Math.floor(player.y / (CHUNK_SIZE * 32));
    if (newChunkX !== currentChunkX || newChunkY !== currentChunkY) {
      currentChunkX = newChunkX;
      currentChunkY = newChunkY;
      unloadFarChunks(currentChunkX, currentChunkY);
      socket.emit("getChunk", { x: currentChunkX, y: currentChunkY });
      socket.emit("requestChunks", { cx: currentChunkX, cy: currentChunkY });
    }
  }

  createJoystick() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2 + height / 4;

    const size = 60;
    const alpha = 0.3;
    // const baseX = size + 20;
    // const baseY = this.scale.height - size - 20;

    this.joystickBase = this.add.circle(centerX, centerY, size, 0x0000ff, 0.1).setScrollFactor(0).setDepth(1000);
    this.joystickThumb = this.add.circle(centerX, centerY, size / 1.5, 0x00ff00, alpha).setScrollFactor(0).setInteractive().setDepth(1001);

    this.joystickThumb.on("pointerdown", () => this.joystickThumb.setData("dragging", true));
    this.input.on("pointerup", () => {
      this.joystickThumb.setData("dragging", false);
      this.joystickThumb.x = this.joystickBase.x;
      this.joystickThumb.y = this.joystickBase.y;
      mobileDir.x = 0;
      mobileDir.y = 0;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.joystickThumb.getData("dragging")) return;
      const dx = pointer.x - this.joystickBase.x;
      const dy = pointer.y - this.joystickBase.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = size;
      const angle = Math.atan2(dy, dx);
      const limitedDist = Math.min(dist, maxDist);

      this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * limitedDist;
      this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * limitedDist;

      mobileDir.x = (limitedDist / maxDist) * Math.cos(angle);
      mobileDir.y = (limitedDist / maxDist) * Math.sin(angle);
    });

    this.joystickThumb.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!player) return;

      let tileX = Math.floor((player.x + (pointer.x - centerX)) / TILE_SIZE) % 20;
      let tileY = Math.floor((player.y + (pointer.y - centerY)) / TILE_SIZE) % 20;

      console.log(tileX, tileY);

      if (tileX < 0) tileX += 20;
      if (tileY < 0) tileY += 20;

      // добавляем в буфер
      const existing = this.chopBuffer.find(t => t.tileX === tileX && t.tileY === tileY);
      if (existing) {
        existing.count++;
      } else {
        this.chopBuffer.push({ tileX, tileY, count: 1 });
      }
    });
  }

  createMessageWindow() {
    const x = 10;
    const y = 10;
    const width = 300;
    const height = 150;

    this.messagesContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    const bg = this.add.rectangle(x, y, width, height, 0x000000, 0.5).setOrigin(0, 0);
    this.messagesContainer.add(bg);

    const text = this.add.text(x + 5, y + 5, "", { fontSize: "14px", color: "#ffffff", wordWrap: { width: width - 10 } });
    this.messagesContainer.add(text);
    this.messages.push(text);

    socket?.on("message", (msg: string) => this.addMessage(msg));

  }

  addMessage(msg: string) {
    const text = this.messages[0];
    const MAX_LINES = 10;
    const lines = [msg, ...text.text.split("\n").slice(0, MAX_LINES - 1)];
    text.setText(lines.join("\n"));
  }

  createMessageToggleKey() {
    this.input!.keyboard!.on("keydown-M", () => {
      this.messagesVisible = !this.messagesVisible;
      this.messagesContainer.setVisible(this.messagesVisible);
    });
  }

  createInventoryButton() {
    const invButton = this.add.text(
      this.scale.width - 10,
      10,
      "🎒",
      { fontSize: "32px", backgroundColor: "#333", padding: { x: 10, y: 5 } }
    )
      .setScrollFactor(0)
      .setInteractive()
      .setOrigin(1, 0)
      .setDepth(1000);

    invButton.on("pointerdown", () => {
      this.scene.pause("GameScene");
      const inventoryScene = this.scene.get("InventoryScene") as InventoryScene;
      if (inventoryScene) {
        inventoryScene.setInventory(this.inventory); // Используем новый метод
        this.scene.launch("InventoryScene");
      }
    });

    this.input.keyboard!.on("keydown-I", () => {
      if (!this.scene.isActive("InventoryScene")) {
        this.scene.pause("GameScene");
        const inventoryScene = this.scene.get("InventoryScene") as InventoryScene;
        if (inventoryScene) {
          inventoryScene.setInventory(this.inventory);
          this.scene.launch("InventoryScene");
        }
      }
    });
  }

  createChopZone() {
    // const { width, height } = this.scale;
    // const zoneSize = 80; // размер зоны рубки
    // const centerX = width / 2;
    // const centerY = height / 2;

    // this.chopZone = this.add.rectangle(centerX, centerY, zoneSize, zoneSize, 0xff00ff, 0.1)
    //   .setOrigin(0.5)
    //   .setInteractive()
    //   .setScrollFactor(0)
    //   .setDepth(10000);



    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (this.chopBuffer.length === 0) return;
        if (!socket) return;

        // отправляем все тапы на сервер
        socket.emit("chopTiles", {
          chunkX: Math.floor(player.x / (CHUNK_SIZE * TILE_SIZE)),
          chunkY: Math.floor(player.y / (CHUNK_SIZE * TILE_SIZE)),
          taps: this.chopBuffer
        });

        this.chopBuffer = []; // очищаем буфер после отправки
      }
    });
  }


  // Метод для добавления ресурса в инвентарь
  addItemToInventory(type: string, count: number) {
    if (!this.inventory[type]) this.inventory[type] = 0;
    this.inventory[type] += count;

    // если сцена инвентаря активна, обновляем её
    // const invScene = this.scene.get("InventoryScene") as any;
    // if (invScene?.isActive()) {
    //   invScene.setInventory(this.inventory);
    // }
  }


  initSocket() {
    initSocket();
    socket.on("connect", () => {
      setTimeout(() => {
        const user = getUserId();
        console.log("Игрок:", user);
        socket.emit("join", {
          ...getUserId(),
        });
      }, 500);

      socket?.on("itemPicked", (data: { type: string; x: number; y: number }) => {
        console.log('itemPicked', data);
        this.addMessage(`Вы подняли ${data.type}`);
        if (this.inventory[data.type]) {
          this.inventory[data.type]++;
        } else {
          this.inventory[data.type] = 1;
        }
      });
      socket?.on("crafted", (data: { inventory: any }) => {
        console.log('crafted', data);
        this.inventory = data.inventory;
      });
      socket?.on("itemRemoved", (data: { chunk: string; x: number; y: number }) => {
        console.log('itemRemoved', data);
        removeItemFromChunk(data.chunk, data.x, data.y);
      });

      console.log("Socket connected", socket.id);

      socket.on("spawn", (data: { x: number; y: number }) => {
        console.log("spawn", data);

        if (!player) {
          createPlayer(this, data.x, data.y);
          createAnimations(this);
          this.cameras.main.startFollow(player);
          this.cameras.main.setBounds(-Infinity, -Infinity, Infinity, Infinity);

          socket.emit("requestChunks", { cx: Math.floor(data.x / (CHUNK_SIZE * 32)), cy: Math.floor(data.y / (CHUNK_SIZE * 32)) });
        }
      });

      socket.on("itemAdded", (data: { chunk: string; x: number; y: number; type: string }) => {
        const { chunk, x, y, type } = data;
        if (!loadedChunks[chunk]) return;

        const loadedChunk = loadedChunks[chunk];
        const [chunkX, chunkY] = chunk.split("_").map(Number);
        const offsetX = chunkX * CHUNK_SIZE * 32;
        const offsetY = chunkY * CHUNK_SIZE * 32;

        const sprite = this.add.image(
          offsetX + x * 32 + 16,
          offsetY + y * 32 + 16,
          "items",
          getItemFrame(type)
        ).setOrigin(0.5).setScale(32 / 16);

        loadedChunk.itemSprites.push({ sprite, x, y, type });
        if (!loadedChunk.items) loadedChunk.items = [];
        loadedChunk.items.push({ x, y, type });

        this.addMessage(`На карте появился ${type}`);
      });

      socket.on("itemDropped", (data: { chunk: string; x: number; y: number; type: string }) => {
        console.log("Item dropped", data)
        const { chunk, x, y, type } = data;
        this.addMessage(`На карте появился ${type}`);
        if (loadedChunks[chunk]) {
          const loadedChunk = loadedChunks[chunk];
          const [chunkX, chunkY] = chunk.split("_").map(Number);

          const offsetX = chunkX * CHUNK_SIZE * 32;
          const offsetY = chunkY * CHUNK_SIZE * 32;

          console.log(offsetX, offsetY)

          const sprite = this.add.image(
            offsetX + x * 32 + 16,
            offsetY + y * 32 + 16,
            "items",
            getItemFrame(type)
          ).setOrigin(0.5).setScale(32 / 16);

          loadedChunk.itemSprites.push({ sprite, x, y, type });
          if (!loadedChunk.items) loadedChunk.items = [];
          loadedChunk.items.push({ x, y, type });
        } else {
          console.log('Chunk not loaded', chunk)
        }

      });
    });

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any, player: any }) => {
      const SNAPSHOT_INTERVAL = 200;

      for (const id in data.players) {
        const p = data.players[id];
        let sprite: SmoothSprite;
        if (id === getUserId().userId) {
          sprite = player;
          if (!sprite) {
            continue;
          }
        }
        else {
          if (!otherPlayers[id]) {
            const s = this.add.sprite(p.x, p.y, "player") as SmoothSprite;
            s.setScale(32 / PLAYER_WIDTH, 32 / PLAYER_HEIGHT);
            s.setOrigin(0.5, 0.5);
            s.setDepth(100);
            otherPlayers[id] = s;
          }
          sprite = otherPlayers[id];
        }

        sprite.targetX = p.x;
        sprite.targetY = p.y;
        sprite.fromX = sprite.x;
        sprite.fromY = sprite.y;
        sprite.startTime = performance.now();
        sprite.duration = SNAPSHOT_INTERVAL;

        if (p?.anim && p.anim !== "" && (sprite.x !== p.x || sprite.y !== p.y)) {
          sprite.play(p.anim, true);
        } else if (id !== getUserId().userId) sprite.anims.stop();
      }

      for (const id in otherPlayers) {
        if (!data.players[id]) {
          otherPlayers[id].destroy();
          delete otherPlayers[id];
        }
      }

      for (const chunkId of Object.keys(data.chunks)) {
        const chunk = data.chunks[chunkId];
        if (chunk && chunkId !== "undefined_undefined" && !loadedChunks[chunkId]) {
          loadChunkFromServer(this, chunkId, chunk);
        }
      }

      if (data?.player?.inventory?.length > 0) {
        for (const inventory of data?.player?.inventory) {
          this.inventory[inventory] = (this.inventory[inventory] ? this.inventory[inventory] : 0) + 1;
        }
      }

    });
  }
}

export default GameScene;