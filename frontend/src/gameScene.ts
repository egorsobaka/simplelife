import Phaser from "phaser";
import { player, createPlayer, createAnimations, PLAYER_WIDTH, PLAYER_HEIGHT, type SmoothSprite } from "./playerController";
import { createHUD } from "./hud";
import { createMinimap, drawMinimap } from "./minimap";
import { loadChunkFromServer, unloadFarChunks, CHUNK_SIZE, loadedChunks, removeItemFromChunk } from "./chunkManager";
import { handleMovementJoystick } from "./movementHelper.js";
import socket from "./socket";

let currentChunkX = 0;
let currentChunkY = 0;
let otherPlayers: Record<string, SmoothSprite> = {};
let lastMoveSent = 0;
const MOVE_THROTTLE = 100;

// джойстик
const mobileDir = { x: 0, y: 0 };

class GameScene extends Phaser.Scene {
  joystickBase!: Phaser.GameObjects.Arc;
  joystickThumb!: Phaser.GameObjects.Arc;
  messagesContainer!: Phaser.GameObjects.Container;
  messages: Phaser.GameObjects.Text[] = [];
  messagesVisible = true;

  constructor() { super({ key: "GameScene" }); }

  preload() {
    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", { frameWidth: 96, frameHeight: 128 });
  }

  create() {
    createPlayer(this, 0, 0);
    createAnimations(this);
    createHUD(this);
    createMinimap(this);

    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(-Infinity, -Infinity, Infinity, Infinity);

    this.initSocket();
    this.createJoystick();
    this.createMessageWindow();
    this.createMessageToggleKey();
  }

  update() {
    if (!player) return;
    const dt = this.game.loop.delta / 1000;
    const maxSpeed = 100;

    // движение через джойстик
    const { isMove, newX, newY, anim } = handleMovementJoystick(mobileDir.x, mobileDir.y, maxSpeed, dt);

    if (isMove) {
      player.x = newX;
      player.y = newY;
      if (anim && player.anims.currentAnim?.key !== anim) player.play(anim, true);
    } else {
      player.anims.stop();
    }

    // отправка на сервер
    const now = performance.now();
    if (isMove && socket && now - lastMoveSent > MOVE_THROTTLE) {
      socket.emit("move", { x: player.x, y: player.y, anim });
      lastMoveSent = now;
    }

    // плавная корректировка к серверной позиции
    if (player.targetX !== undefined && player.targetY !== undefined) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 10;
      const correctionSpeed = 100;
      if (dist > threshold) {
        const step = correctionSpeed * dt;
        player.x += dx / dist * Math.min(step, dist);
        player.y += dy / dist * Math.min(step, dist);
      }
    }

    // плавное движение других игроков
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
    socket?.on("itemPicked", (data: { type: string; x: number; y: number }) => this.addMessage(`Вы подняли ${data.type}`));
    socket?.on("itemRemoved", (data: { chunk: string; x: number; y: number }) => {
      removeItemFromChunk(data.chunk, data.x, data.y);
    });
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

  initSocket() {
    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("join");
      socket.emit("requestChunks", { cx: currentChunkX, cy: currentChunkY });
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

    function getItemFrame(type: string): number {
      const ITEM_INDEX: Record<string, number> = {
        woodItem: 526,
        eggItem: 563,
        stoneItem: 210,
      };
      return ITEM_INDEX[type] ?? 0;
    }

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any }) => {
      const SNAPSHOT_INTERVAL = 200;

      for (const id in data.players) {
        const p = data.players[id];
        let sprite: SmoothSprite;

        if (id === socket.id) sprite = player;
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
        } else if (id !== socket.id) sprite.anims.stop();
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
    });
  }
}

export default GameScene;
