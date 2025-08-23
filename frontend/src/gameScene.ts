import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import {
  player,
  createPlayer,
  createAnimations,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  type SmoothSprite
} from "./playerController";
import { createHUD, updateHUD } from "./hud";
import { createMinimap, drawMinimap } from "./minimap";
import { loadChunkFromServer, unloadFarChunks, CHUNK_SIZE, loadedChunks } from "./chunkManager";

let currentChunkX = 0;
let currentChunkY = 0;
let otherPlayers: Record<string, SmoothSprite> = {};
let socket!: Socket;
let lastMoveSent = 0;
const MOVE_THROTTLE = 100; // ms

const mobileDir = { x: 0, y: 0 };

class GameScene extends Phaser.Scene {
  joystickBase!: Phaser.GameObjects.Arc;
  joystickThumb!: Phaser.GameObjects.Arc;
  messageText!: Phaser.GameObjects.Text;

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
  }

  createJoystick() {
    const size = 60;
    const alpha = 0.3;
    const baseX = size + 20;
    const baseY = this.scale.height - size - 20;

    this.joystickBase = this.add.circle(baseX, baseY, size, 0x0000ff, alpha)
      .setScrollFactor(0)
      .setDepth(1000); // поверх всего

    this.joystickThumb = this.add.circle(baseX, baseY, size / 2, 0x00ff00, alpha)
      .setScrollFactor(0)
      .setInteractive()
      .setDepth(1001); // поверх базы

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
    const width = this.scale.width;

    this.messageText = this.add.text(10, 10, "", {
      font: "16px Arial",
      color: "#ffffff",
      wordWrap: { width: width - 20 }
    }).setScrollFactor(0).setDepth(2000); // поверх всего
  }

  addMessage(msg: string) {
    const lines = this.messageText.text.split("\n");
    lines.push(msg);
    if (lines.length > 5) lines.shift(); // максимум 5 последних сообщений
    this.messageText.setText(lines.join("\n"));
  }

  update() {
    if (!player) return;
    const dt = this.game.loop.delta / 1000;

    const speed = 150; // px/sec
    let isMove = false;
    let newX = player.x;
    let newY = player.y;
    let anim: string | null = null;

    if (mobileDir.x !== 0 || mobileDir.y !== 0) {
      newX += mobileDir.x * speed * dt;
      newY += mobileDir.y * speed * dt;
      isMove = true;
      if (Math.abs(mobileDir.x) > Math.abs(mobileDir.y)) anim = mobileDir.x > 0 ? "walk_right" : "walk_left";
      else anim = mobileDir.y > 0 ? "walk_down" : "walk_up";
    }

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

    if (player.targetX !== undefined && player.targetY !== undefined) {
      const dx = player.targetX - player.x;
      const dy = player.targetY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = 4;
      const correctionSpeed = 120;
      if (dist > threshold) {
        const step = correctionSpeed * dt;
        player.x += dx / dist * Math.min(step, dist);
        player.y += dy / dist * Math.min(step, dist);
      }
    }

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
    updateHUD(currentChunkX, currentChunkY);
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

  initSocket() {
    socket = io("https://game.almet22.ru", {
      path: "/socket.io/",
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("join");
      socket.emit("requestChunks", { cx: currentChunkX, cy: currentChunkY });
    });

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any, messages?: string[] }) => {
      const SNAPSHOT_INTERVAL = 200;

      // игроки
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

        if (p?.anim && p.anim !== "" && (sprite.x !== p.x || sprite.y !== p.y)) sprite.play(p.anim, true);
        else if (id !== socket.id) sprite.anims.stop();
      }

      // удаляем отсутствующих игроков
      for (const id in otherPlayers) {
        if (!data.players[id]) {
          otherPlayers[id].destroy();
          delete otherPlayers[id];
        }
      }

      // чанки
      for (const chunkId of Object.keys(data.chunks)) {
        const chunk = data.chunks[chunkId];
        if (chunk && chunkId !== "undefined_undefined" && !loadedChunks[chunkId]) {
          loadChunkFromServer(this, chunkId, chunk);
        }
      }

      // сообщения
      if (data.messages) {
        for (const msg of data.messages) this.addMessage(msg);
      }
    });
  }
}

export default GameScene;
