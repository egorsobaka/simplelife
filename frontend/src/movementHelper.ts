import { player } from "./playerController";
import { loadedChunks, CHUNK_SIZE } from "./chunkManager";

// вспомогательная функция для корректного модуля
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// основной хелпер движения через джойстик
// dx, dy — направление от джойстика в диапазоне [-1, 1]
// maxSpeed — пикселей в секунду
// dt — дельта времени в секундах
export function handleMovementJoystick(dx: number, dy: number, maxSpeed: number, dt: number) {
  if (!player) return { isMove: false, newX: 0, newY: 0, anim: null };

  let newX = player.x + dx * maxSpeed * dt;
  let newY = player.y + dy * maxSpeed * dt;

  let moving = dx !== 0 || dy !== 0;
  let anim: string | null = null;

  if (Math.abs(dx) > Math.abs(dy)) anim = dx > 0 ? "walk_right" : "walk_left";
  else if (Math.abs(dy) > 0) anim = dy > 0 ? "walk_down" : "walk_up";

  if (!canMoveTo(newX, newY)) {
    newX = player.x;
    newY = player.y;
    moving = false;
    anim = null;
  }

  return { isMove: moving, newX, newY, anim };
}

// проверка столкновения с тайлами
function canMoveTo(x: number, y: number) {
  const tileX = Math.floor(x / 32);
  const tileY = Math.floor(y / 32);
  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  const key = `${chunkX}_${chunkY}`;
  const chunk = loadedChunks[key];

  if (!chunk) return true; // если чанка нет, разрешаем движение

  const localX = mod(tileX, CHUNK_SIZE);
  const localY = mod(tileY, CHUNK_SIZE);
  const tileType = chunk.tileData[`${localX}_${localY}`];

  // запрещённые тайлы
  const blockedTiles = ["water", "shore_top", "shore_bottom", "shore_left", "shore_right", "rock"];
  const blockedItems = ["woodItem", "rock", "iron_ore", "copper_ore", "gold_ore"];
  const itemType: any = chunk.items.find((item) => item.x === localX && item.y === localY)?.type;
  return !blockedTiles.includes(tileType) && !blockedItems.includes(itemType);
}
