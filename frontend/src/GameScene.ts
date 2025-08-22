import Phaser from "phaser";
import { io, Socket } from "socket.io-client";

const TILE_SIZE = 32;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;
const PLAYER_WIDTH = 96;
const PLAYER_HEIGHT = 128;
const LAND_SPRITE_SIZE = 16;

const IDLE_FRAME: any = {
  down: 0,
  left: 0,
  right: 0,
  up: 9
};

interface MapTile {
  sprite: Phaser.GameObjects.Image;
  type: string;
}

interface Item {
  x: number;
  y: number;
  type: string;
  sprite: Phaser.GameObjects.Image;
}

interface OtherPlayer {
  sprite: Phaser.GameObjects.Sprite;
  targetX: number;
  targetY: number;
}

let map: MapTile[][] = [];
let items: Item[] = [];
let otherPlayers: Record<string, OtherPlayer> = {};

let player!: Phaser.GameObjects.Sprite;
let cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
let minimap!: Phaser.GameObjects.Graphics;

class GameScene extends Phaser.Scene {
  socket!: Socket;

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    this.load.spritesheet("tiles", "/roguelikeSheet_transparent.png", {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });

    this.load.spritesheet("player", "/character_maleAdventurer_sheet.png", {
      frameWidth: PLAYER_WIDTH,
      frameHeight: PLAYER_HEIGHT,
      margin: 0,
      spacing: 0,
    });
  }

  create() {
    cursors = this.input.keyboard!.createCursorKeys();
    console.log(cursors);
    ({ map, items } = this.generateMap());
    player = this.add.sprite(TILE_SIZE, TILE_SIZE, "player");
    player.setScale(TILE_SIZE / PLAYER_WIDTH, TILE_SIZE / PLAYER_HEIGHT); // 100x150 -> 17x17
    player.setOrigin(0.5, 0.5); // чтобы позиционирование по верхнему левому углу
    this.createAnimations();

    minimap = this.add.graphics();
    this.initSocket();
  }

  update() {
    this.handleMovement();
    this.updateOtherPlayers();
    // this.drawMinimap(); 
  }

  generateMap(): { map: MapTile[][]; items: Item[] } {
    const mapArr: MapTile[][] = [];
    const itemsArr: Item[] = [];
    const TILE_INDEX: Record<string, number> = {
      grass: 5,
      sand: 8,
      water: 0,
      tree: 66,
      stone: 7,
      woodItem: 526,
      eggItem: 563,
      stoneItem: 210,
    };

    // === сначала всё трава
    for (let y = 0; y < MAP_HEIGHT; y++) {
      mapArr[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        mapArr[y][x] = { sprite: null as any, type: "grass" };
      }
    }

    // === РЕКА (змейкой через карту)
    let ry = Math.floor(MAP_HEIGHT / 2);
    for (let x = 0; x < MAP_WIDTH; x++) {
      for (let w = -1; w <= 1; w++) {
        const yy = ry + w;
        if (yy >= 0 && yy < MAP_HEIGHT) mapArr[yy][x].type = "water";
      }
      // случайный изгиб
      ry += Math.floor(Math.random() * 2) - 1;
      if (ry < 2) ry = 2;
      if (ry > MAP_HEIGHT - 3) ry = MAP_HEIGHT - 3;
    }

    // === ОЗЁРА
    // for (let i = 0; i < 3; i++) {
    //   const cx = Math.floor(Math.random() * MAP_WIDTH);
    //   const cy = Math.floor(Math.random() * MAP_HEIGHT);
    //   const r = 3 + Math.floor(Math.random() * 4);
    //   for (let y = cy - r; y <= cy + r; y++) {
    //     for (let x = cx - r; x <= cx + r; x++) {
    //       if (x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT) {
    //         const dx = x - cx, dy = y - cy;
    //         if (dx * dx + dy * dy <= r * r) mapArr[y][x].type = "water";
    //       }
    //     }
    //   }
    // }

    // === Каменные гряды
    for (let i = 0; i < 5; i++) {
      let gx = Math.floor(Math.random() * MAP_WIDTH);
      let gy = Math.floor(Math.random() * MAP_HEIGHT);
      for (let len = 0; len < 8; len++) {
        if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) {
          mapArr[gy][gx].type = "stone";
        }
        gx += Math.floor(Math.random() * 3) - 1;
        gy += Math.floor(Math.random() * 3) - 1;
      }
    }

    // === Лесные кластеры
    for (let i = 0; i < 2; i++) {
      const cx = Math.floor(Math.random() * MAP_WIDTH);
      const cy = Math.floor(Math.random() * MAP_HEIGHT);
      for (let y = cy - 3; y <= cy + 3; y++) {
        for (let x = cx - 3; x <= cx + 3; x++) {
          if (x >= 0 && y >= 0 && x < MAP_WIDTH && y < MAP_HEIGHT) {
            if (Math.random() < 0.4) mapArr[y][x].type = "tree";
          }
        }
      }
    }

    // === Рисуем тайлы и предметы
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const type = mapArr[y][x].type;
        const tile = this.add
          .image(x * TILE_SIZE, y * TILE_SIZE, "tiles", TILE_INDEX[type])
          .setOrigin(0)
          .setScale(TILE_SIZE / LAND_SPRITE_SIZE, TILE_SIZE / LAND_SPRITE_SIZE);

        mapArr[y][x].sprite = tile;

        // предметы только на траве
        if (type === "grass" && Math.random() < 0.05) {

          let itemType = Math.random() < 0.5 ? "woodItem" : "stoneItem";

          if (Math.random() < 0.5) {
            itemType = "eggItem";
          }

          const itemSprite = this.add
            .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "tiles", TILE_INDEX[itemType])
            .setScale(TILE_SIZE / 17, TILE_SIZE / 17)
            .setOrigin(0.5);
          itemsArr.push({ x, y, type: itemType, sprite: itemSprite });
        }
      }
    }

    return { map: mapArr, items: itemsArr };
  }

  createAnimations() {
    this.anims.create({
      key: "walk_down",
      frames: this.anims.generateFrameNumbers("player", { start: 16, end: 17 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk_left",
      frames: this.anims.generateFrameNumbers("player", { start: 10, end: 10 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk_right",
      frames: this.anims.generateFrameNumbers("player", { start: 24, end: 26 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: "walk_up",
      frames: this.anims.generateFrameNumbers("player", { start: 5, end: 6 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  initSocket() {
    this.socket = io("http://localhost:3000");

    this.socket.on("connect", () => {
      console.log("Socket.IO подключен, id:", this.socket.id);
    });

    this.socket.on("snapshot", (data: any) => {
      if (!data?.players) return;
      Object.keys(data.players).forEach((id) => {
        if (id !== this.socket.id) {
          const p = data.players[id];
          if (!otherPlayers[id]) {
            const sprite = this.add.sprite(p.x, p.y, "player");
            otherPlayers[id] = { sprite, targetX: p.x, targetY: p.y };
          } else {
            otherPlayers[id].targetX = p.x;
            otherPlayers[id].targetY = p.y;
          }
        }
      });
    });

    this.socket.on("disconnect", () => {
      console.log("Отключено от сервера");
      otherPlayers = {}; // очищаем список других игроков
    });
  }

  handleMovement() {
    const speed = 1;
    let dx = 0;
    let dy = 0;
    let anim: string | null = null;

    if (cursors.left?.isDown) { dx = -speed; anim = "walk_left"; }
    else if (cursors.right?.isDown) { dx = speed; anim = "walk_right"; }
    if (cursors.up?.isDown) { dy = -speed; anim = "walk_up"; }
    else if (cursors.down?.isDown) { dy = speed; anim = "walk_down"; }

    if (this.canMove(dx, 0)) {
      player.x += dx;
      if (anim) player.anims.play(anim, true);
    } else {
      player.anims.stop();
    }
    if (this.canMove(0, dy)) {
      player.y += dy;
      if (anim) player.anims.play(anim, true);
    } else {
      player.anims.stop();
    }

    if (!dx && !dy) {
      // Выбираем направление последнего движения
      const lastDir = player.anims.currentAnim?.key.split("_")[1] || "down";
      player.setFrame(IDLE_FRAME[lastDir]);
    }

    // проверка на сбор предметов
    this.checkInteraction();

    // отправка позиции на сервер
    if (this.socket && this.socket.connected) {
      this.socket.emit("move", { x: player.x, y: player.y });
    }
  }


  canMove(dx: number, dy: number) {
    if (!player.x || !player.y) return false;

    // будущие координаты центра игрока
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    const half = TILE_SIZE / 2;

    const corners: any[] = [];
    if (dx > 0) {
      corners.push({ x: nextX + half, y: nextY })
    }
    if (dx < 0) {
      corners.push({ x: nextX - half, y: nextY })
    }
    if (dy > 0) {
      corners.push({ x: nextX, y: nextY + half })
    }
    if (dy < 0) {
      corners.push({ x: nextX, y: nextY - half })
    }

    for (const c of corners) {
      const tileX = Math.floor(c.x / TILE_SIZE);
      const tileY = Math.floor(c.y / TILE_SIZE);

      // за границей карты
      if (tileX < 0 || tileY < 0 || tileX >= MAP_WIDTH || tileY >= MAP_HEIGHT) {
        console.log(tileX, tileY)
        return false;
      }

      const type = map[tileY][tileX].type;
      if (type === "water" || type === "tree" || type === "stone") {
        console.log(tileX, tileY, type)
        return false;
      }
    }

    return true;
  }

  checkInteraction() {
    const tileX = Math.floor(player.x / TILE_SIZE);
    const tileY = Math.floor(player.y / TILE_SIZE);

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item.x === tileX && item.y === tileY) {
        console.log(`Собрано: ${item.type}`);
        item.sprite.destroy();
        items.splice(i, 1);
      }
    }
  }

  updateOtherPlayers() {
    Object.values(otherPlayers).forEach((p) => {
      p.sprite.x += (p.targetX - p.sprite.x) * 0.1;
      p.sprite.y += (p.targetY - p.sprite.y) * 0.1;
    });
  }

  drawMinimap() {
    if (!minimap) return;

    const scale = 0.1;
    minimap.clear();
    minimap.fillStyle(0x000000, 0.5);
    minimap.fillRect(0, 0, MAP_WIDTH * TILE_SIZE * scale, MAP_HEIGHT * TILE_SIZE * scale);

    minimap.fillStyle(0x00ff00, 1);
    minimap.fillRect(player.x * scale, player.y * scale, 3, 3);

    minimap.fillStyle(0xff0000, 1);
    Object.values(otherPlayers).forEach((p) => {
      minimap.fillRect(p.sprite.x * scale, p.sprite.y * scale, 3, 3);
    });

    minimap.fillStyle(0xffff00, 1);
    items.forEach((item) => {
      minimap.fillRect(item.x * TILE_SIZE * scale, item.y * TILE_SIZE * scale, 2, 2);
    });
  }
}

export default GameScene;
