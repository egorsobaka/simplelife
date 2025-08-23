import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import {
  player,
  createPlayer,
  handleMovement,
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
let cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
let otherPlayers: Record<string, SmoothSprite> = {};
let socket!: Socket;
let lastMoveSent = 0;
const MOVE_THROTTLE = 200; // ms

class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }

  preload() {
    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", { frameWidth: 96, frameHeight: 128 });
  }

  create() {
    cursors = this.input!.keyboard!.createCursorKeys();
    createPlayer(this, 0, 0);
    createAnimations(this);
    createHUD(this);
    createMinimap(this);
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(-Infinity, -Infinity, Infinity, Infinity);
    this.initSocket();
  }

  update() {
    if (!player) return;

    const { isMove, newX, newY, anim } = handleMovement(cursors);
    const now = performance.now();

    // анимация движения
    if (isMove && anim) {
      if (player.anims.currentAnim?.key !== anim) player.play(anim, true);
    } else {
      player.anims.stop();
    }

    // отправка движения на сервер
    if (isMove && socket && now - lastMoveSent > MOVE_THROTTLE) {
      socket.emit("move", { x: newX, y: newY, anim });
      lastMoveSent = now;
    }

    // плавное движение всех игроков
    const dt = this.game.loop.delta / 1000;
    const speed = 200; // px/sec

    function smoothMove(sprite: SmoothSprite) {
      if (sprite.targetX === undefined || sprite.targetY === undefined) return;
      const dx = sprite.targetX - sprite.x;
      const dy = sprite.targetY - sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.5) return;
      const step = speed * dt;
      sprite.x += dx / dist * Math.min(step, dist);
      sprite.y += dy / dist * Math.min(step, dist);
    }

    smoothMove(player);
    for (const id in otherPlayers) smoothMove(otherPlayers[id]);

    // смена чанка
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

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any }) => {
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

        // обновление целевых координат для плавного движения
        sprite.targetX = p.x;
        sprite.targetY = p.y;
        sprite.fromX = sprite.x;
        sprite.fromY = sprite.y;
        sprite.startTime = performance.now();
        sprite.duration = SNAPSHOT_INTERVAL;

        if (p?.anim && p?.anim !== "") {
          console.log(p)
          sprite.play(p.anim, true);
        } else {
          sprite.anims.stop();
        }
      }

      // удаляем несуществующих игроков
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
    });
  }
}

export default GameScene;
