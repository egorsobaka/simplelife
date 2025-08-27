import Phaser from "phaser";

export const CHUNK_SIZE = 20;

export interface ChunkData {
  tiles: { x: number; y: number; type: string }[];
  items: { x: number; y: number; type: string }[];
}

export interface Chunk {
  tileSprites: Phaser.GameObjects.Image[];
  itemSprites: { sprite: Phaser.GameObjects.Image; x: number; y: number; type: string }[];
  tileData: Record<string, string>; // key = `${x}_${y}`, value = type
  items: { x: number; y: number; type: string }[]; // добавили
}


export const loadedChunks: Record<string, Chunk> = {};

/**
 * Загружаем чанк, полученный с сервера
 */
export function loadChunkFromServer(scene: Phaser.Scene, key: string, data: ChunkData) {
  const [chunkX, chunkY] = key.split("_").map(Number);

  if (loadedChunks[key]) return loadedChunks[key];

  const offsetX = chunkX * CHUNK_SIZE * 32;
  const offsetY = chunkY * CHUNK_SIZE * 32;

  const tileSprites: Phaser.GameObjects.Image[] = [];
  const tileData: Record<string, string> = {};

  (data.tiles as any[]).forEach((row, y) => {
    if (Array.isArray(row)) {
      row.forEach(({ type }, x) => {
        const sprite = scene.add.image(
          offsetX + x * 32,
          offsetY + y * 32,
          "tiles",
          getTileFrame(type)
        )
          .setOrigin(0)
          .setScale(32 / 16);
        tileSprites.push(sprite);
        tileData[`${x}_${y}`] = type;
      });
    }
  });

  // Предметы
  const itemSprites: { sprite: Phaser.GameObjects.Image; x: number; y: number; type: string }[] = [];
  const items: { x: number; y: number; type: string }[] = [];
  data.items.forEach(i => {
    const sprite = scene.add.image(offsetX + i.x * 32 + 16, offsetY + i.y * 32 + 16, "tiles", getItemFrame(i.type))
      .setOrigin(0.5)
      .setScale(32 / 16);
    itemSprites.push({ sprite, x: i.x, y: i.y, type: i.type });
    items.push({ x: i.x, y: i.y, type: i.type });
  });

  loadedChunks[key] = { tileSprites, itemSprites, tileData, items };
  return loadedChunks[key];
}

// === frame для тайлов ===
export function getTileFrame(type: string): number {
  const TILE_INDEX: Record<string, number> = {
    // Вставьте сюда индексы для тайлов
    grass: 5, // Например, это индекс для травы
    water: 0, // Например, это индекс для воды
    tree: 628, // Например, это индекс для дерева
    stone: 7, // Например, это индекс для камня
    sand: 8, // Например, это индекс для песка
    shore_top: 3,
    shore_bottom: 117,
    shore_left: 60,
    shore_right: 62,
    forest: 66, // Например, это индекс для леса
    rock: 233,
  };
  return TILE_INDEX[type] ?? 7;
}

// === frame для предметов ===
export function getItemFrame(type: string): number {
  const ITEM_INDEX: Record<string, number> = {
    wood: 1307,
    reed: 649,
    hide: 140,
    coal: 396,
    fiber: 535,
    herb: 592,
    woodItem: 528,
    stoneItem: 1034,
    ironOre: 1251,
    stone: 1016, // Например, это индекс для камня
    eggItem: 563, // Например, это индекс для яйца
    iron_ore: 1251, // Например, это индекс для железной руды
    copper_ore: 1194, // Например, это индекс для медной руды
    gold_ore: 615,
    tin_ore: 602, // Например, это индекс для оловянной руды
    sand: 603,
    clay: 1137,
    cotton: 606,
    mashroom: 447,
    deciduous_tree: 529,
    bad_mashroom: 333,
    salt: 611,
    fish: 740,
    plank: 613,
    stick: 614,
    rope: 615,
    cloth: 616,
    leather: 617,
    iron_ingot: 618,
    bronze_ingot: 619,
    gold_ingot: 620,
    glass: 621,
    brick: 622,
    paper: 623,
    bowstring: 624,
    sword: 625,
    axe: 626,
    bow: 627,
    crossbow: 628,
    shield: 629,
    armor: 630,
    helmet: 631,
    pickaxe: 632,
    hammer: 633,
    torch: 634,
    lantern: 635,
    furnace: 636,
    anvil: 637,
    bed: 638,
    table: 639,
    chair: 640,
    bottle: 641,
    pottery: 642,
    book: 643,
    map: 644,
    ring: 645,
    amulet: 646,
    potion: 647,
    bread: 648,
    meat_stew: 649,
    shell: 562,
  };
  return ITEM_INDEX[type] ?? 28;
}

/**
 * Выгружаем чанки, которые слишком далеко
 */
export function unloadFarChunks(currentChunkX: number, currentChunkY: number) {
  Object.keys(loadedChunks).forEach(key => {
    const [cx, cy] = key.split("_").map(Number);
    if (Math.abs(cx - currentChunkX) > 1 || Math.abs(cy - currentChunkY) > 1) {
      const chunk = loadedChunks[key];
      chunk.tileSprites.forEach(t => t.destroy());
      chunk.itemSprites.forEach(i => i.sprite.destroy());
      delete loadedChunks[key];
    }
  });
}

/**
 * Удаление предмета с карты по координатам
 */
export function removeItemFromChunk(chunkKey: string, x: number, y: number) {
  const chunk = loadedChunks[chunkKey];
  if (!chunk) return;
  const idx = chunk.itemSprites.findIndex(i => i.x === x && i.y === y);
  if (idx >= 0) {
    chunk.itemSprites[idx].sprite.destroy();
    chunk.itemSprites.splice(idx, 1);
  }
}
