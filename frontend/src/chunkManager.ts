import Phaser from "phaser";

export const CHUNK_SIZE = 20;

export interface ChunkData {
  tiles: { x: number; y: number; type: string }[];
  items: { x: number; y: number; type: string }[];
}

export interface Chunk {
  tileSprites: Phaser.GameObjects.Image[];
  itemSprites: Phaser.GameObjects.Image[];
  tileData: Record<string, string>; // key = `${x}_${y}`, value = type
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
      row.forEach(({type}, x) => {
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
  const itemSprites: Phaser.GameObjects.Image[] = [];
  data.items.forEach(i => {
    const sprite = scene.add.image(offsetX + i.x * 32 + 16, offsetY + i.y * 32 + 16, "tiles", getItemFrame(i.type))
      .setOrigin(0.5)
      .setScale(32 / 16);
    itemSprites.push(sprite);
  });

  loadedChunks[key] = { tileSprites, itemSprites, tileData };
  return loadedChunks[key];
}

// frame для тайлов
function getTileFrame(type: string): number {
  const TILE_INDEX: Record<string, number> = {
    grass: 5,
    water: 0,
    tree: 66,
    stone: 7,
    shore_top: 3,
    shore_bottom: 117,
    shore_left: 60,
    shore_right: 62,
  };
  return TILE_INDEX[type] ?? 5;
}

// frame для предметов
function getItemFrame(type: string): number {
  const ITEM_INDEX: Record<string, number> = {
    woodItem: 526,
    eggItem: 563,
    stoneItem: 210,
  };
  return ITEM_INDEX[type] ?? 0;
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
      chunk.itemSprites.forEach(i => i.destroy());
      delete loadedChunks[key];
    }
  });
}
