import Phaser from "phaser";
import { player, createPlayer, createAnimations, PLAYER_WIDTH, PLAYER_HEIGHT, type SmoothSprite } from "./playerController";
import { createHUD } from "./hud";
import { createMinimap, drawMinimap } from "./minimap";
import { loadChunkFromServer, unloadFarChunks, CHUNK_SIZE, loadedChunks, removeItemFromChunk, getItemFrame } from "./chunkManager";
import { handleMovementJoystick } from "./movementHelper.js";
import { initSocket, socket } from "./socket";
import { InventoryScene } from "./inventoryScene";
import { fetchCraftableItems } from "./craftingAPI.js";
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
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = "guest_" + Date.now();
    localStorage.setItem("userId", userId);
  }
  return userId;
}

class GameScene extends Phaser.Scene {
  joystickBase!: Phaser.GameObjects.Arc;
  joystickThumb!: Phaser.GameObjects.Arc;
  messagesContainer!: Phaser.GameObjects.Container;
  messages: Phaser.GameObjects.Text[] = [];
  messagesVisible = true;
  inventory: { [key: string]: number } = {};

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", { frameWidth: 96, frameHeight: 128 });
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
    const gridGroup = this.add.group();
    const cols = 5; // количество колонок
    const spriteSize = 48;
    const padding = 10;
    const startX = 100;
    const startY = 100;

    // фильтруем только то, что реально крафтится
    const craftables = craftableItems.filter(item => item.craftable);

    craftables.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * (spriteSize + padding);
      const y = startY + row * (spriteSize + padding);

      // берём фрейм по типу предмета
      const frame = getItemFrame(item.name);

      const sprite = this.add.sprite(x, y, "itemsAtlas", frame)
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
              initData: tg.initData,
            }),
          });
          const result = await response.json();

          if (result.success) {
            this.addMessage(`✅ Создан предмет: ${item.title}`);
            gridGroup.clear(true, true);
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
    const size = 60;
    const alpha = 0.3;
    const baseX = size + 20;
    const baseY = this.scale.height - size - 20;

    this.joystickBase = this.add.circle(baseX, baseY, size, 0x0000ff, alpha).setScrollFactor(0).setDepth(1000);
    this.joystickThumb = this.add.circle(baseX, baseY, size / 2, 0x00ff00, alpha).setScrollFactor(0).setInteractive().setDepth(1001);

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

  initSocket() {
    initSocket();
    socket.on("connect", () => {
      const tg = window?.Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      if (user) {
        console.log("Игрок из Telegram:", user);
        socket.emit("join", {
          userId: user.id,
          username: user.username,
          firstName: user.first_name,
          initData: tg?.initData
        });
      } else {
        const userId = getUserId();
        socket.emit("join", { userId: userId });
      }

      socket?.on("itemPicked", (data: { type: string; x: number; y: number }) => {
        console.log('itemPicked', data);
        this.addMessage(`Вы подняли ${data.type}`);
        if (this.inventory[data.type]) {
          this.inventory[data.type]++;
        } else {
          this.inventory[data.type] = 1;
        }
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
          "tiles",
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
            "tiles",
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

    function getItemFrame(type: string): number {
      const ITEM_INDEX: Record<string, number> = {
        woodItem: 526,
        eggItem: 563,
        stoneItem: 210,
      };
      return ITEM_INDEX[type] ?? 0;
    }

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any, player: any }) => {
      const SNAPSHOT_INTERVAL = 200;

      for (const id in data.players) {
        const p = data.players[id];
        let sprite: SmoothSprite;
        if (id === getUserId()) {
          continue;
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
        } else if (id !== getUserId()) sprite.anims.stop();
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