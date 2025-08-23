import Phaser from "phaser";
import { loadedChunks, CHUNK_SIZE } from "./chunkManager";

export const PLAYER_WIDTH = 96;
export const PLAYER_HEIGHT = 128;

export let player!: Phaser.GameObjects.Sprite;

export function createPlayer(scene: Phaser.Scene, x: number, y: number) {
  player = scene.add.sprite(x, y, "player");
  player.setScale(32 / PLAYER_WIDTH, 32 / PLAYER_HEIGHT);
  player.setOrigin(0.5, 0.5);
  player.setDepth(100);
  return player;
}

// модульная функция остатка
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// движение с ограничением: нельзя по воде
export function handleMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
  const speed = 2;
  let newX = player.x;
  let newY = player.y;

  let moving = false;
  let anim: string | null = null;

  if (cursors.left?.isDown) { newX -= speed; anim = "walk_left"; moving = true; }
  if (cursors.right?.isDown) { newX += speed; anim = "walk_right"; moving = true; }
  if (cursors.up?.isDown) { newY -= speed; anim = "walk_up"; moving = true; }
  if (cursors.down?.isDown) { newY += speed; anim = "walk_down"; moving = true; }

  const tileX = Math.floor(newX / 32);
  const tileY = Math.floor(newY / 32);
  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const key = `${chunkX}_${chunkY}`;
  const chunk = loadedChunks[key];

  if (chunk) {
    const localX = mod(tileX, CHUNK_SIZE);
    const localY = mod(tileY, CHUNK_SIZE);
    const tileType = chunk.tileData[`${localX}_${localY}`];

    if (!["water","shore_top","shore_bottom","shore_left","shore_right"].includes(tileType)) {
      player.x = newX;
      player.y = newY;
    }
  } else {
    player.x = newX;
    player.y = newY;
  }

  // анимация
  if (moving && anim) {
    if (player.anims.currentAnim?.key !== anim) player.play(anim, true);
  } else {
    player.anims.stop();
  }

  return { isMove: moving };
}

export function createAnimations(scene: Phaser.Scene) {
  scene.anims.create({ key: "walk_down", frames: scene.anims.generateFrameNumbers("player", { start: 16, end: 17 }), frameRate: 5, repeat: -1 });
  scene.anims.create({ key: "walk_up", frames: scene.anims.generateFrameNumbers("player", { start: 5, end: 6 }), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: "walk_left", frames: scene.anims.generateFrameNumbers("player", { start: 10, end: 10 }), frameRate: 10, repeat: -1 });
  scene.anims.create({ key: "walk_right", frames: scene.anims.generateFrameNumbers("player", { start: 24, end: 26 }), frameRate: 10, repeat: -1 });
}
