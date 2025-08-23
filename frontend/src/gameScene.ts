import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import { player, createPlayer, handleMovement, createAnimations } from "./playerController";
import { createHUD, updateHUD } from "./hud";
import { createMinimap, drawMinimap } from "./minimap";
import { loadChunkFromServer, unloadFarChunks, CHUNK_SIZE } from "./chunkManager";

let currentChunkX = 0;
let currentChunkY = 0;
let cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
let otherPlayers: Record<string, Phaser.GameObjects.Sprite> = {};
let socket!: Socket;
let lastMoveSent = 0;
const MOVE_THROTTLE = 100; // ms

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

    const { isMove } = handleMovement(cursors);
    const now = performance.now();
    if (isMove && socket && now - lastMoveSent > MOVE_THROTTLE) {
      socket.emit("move", { x: player.x, y: player.y });
      lastMoveSent = now;
    }

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
      path: "/socket.io",
      transports: ["websocket", "polling"]
    });
    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
      socket.emit("join");
      // socket.emit("getChunk", { x: currentChunkX, y: currentChunkY });
      socket.emit("requestChunks", { cx: currentChunkX, cy: currentChunkY });
    });

    //socket.on("chunkData", (data: { x: number; y: number; chunk: ChunkData }) => {
    // loadChunkFromServer(this, data.x, data.y, data.chunk);
    //});

    socket.on("snapshot", (data: { players: Record<string, any>, chunks: any }) => {
      for (const id in data.players) {
        const p = data.players[id];
        if (id === socket.id) { player.setPosition(p.x, p.y); continue; }
        if (!otherPlayers[id]) otherPlayers[id] = this.add.sprite(p.x, p.y, "player", 0);
        else otherPlayers[id].setPosition(p.x, p.y);
      }
      // удаляем игроков, которых нет
      for (const id in otherPlayers) {
        if (!data.players[id]) { otherPlayers[id].destroy(); delete otherPlayers[id]; }
      }
      if (Object.keys(data.chunks).length > 0) {
        for (const chunkId of Object.keys(data.chunks)) {
          const chunk = data.chunks[chunkId];
          console.log(chunk)
          if (chunk && chunkId !== "undefined_undefined") {
            loadChunkFromServer(this, chunkId, chunk);
          }
        }
      }
    });
  }
}

export default GameScene;
