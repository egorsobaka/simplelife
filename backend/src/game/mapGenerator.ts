export const TILE_SIZE = 32;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;

export interface MapTile {
  type: string;
}

export interface Item {
  x: number;
  y: number;
  type: string;
}

// глобальные данные для генерации рек и гор по чанкам
const chunkRivers: Record<string, { positions: number[]; borders: { x: number; y: number }[] }> = {};
const chunkMountains: Record<string, { ranges: { x: number; y: number }[]; borders: { x: number; y: number }[] }> = {};

// безопасно установить тайл
function safeSetTile(mapArr: MapTile[][], x: number, y: number, type: string) {
  if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
    if (!mapArr[y][x]) {
      mapArr[y][x] = { type: "grass" };
    }
    mapArr[y][x].type = type;
  }
}

// === генерация деревьев ===
function generateTrees(mapArr: MapTile[][], itemsArr: Item[]) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const item = itemsArr.find((item: any) => item.x === x && item.y === y)
      if (item) {
        continue;
      }
      if (mapArr[y][x].type === "forest") {
        if (Math.random() < 0.9) {
          itemsArr.push({ x, y, type: "woodItem" });
        }
      }
      if (mapArr[y][x].type === "tree") {
        if (Math.random() < 0.3) {
          itemsArr.push({ x, y, type: "woodItem" });
        }
      }
      if (mapArr[y][x].type === "stone") {
        if (Math.random() < 0.2) {
          itemsArr.push({ x, y, type: "woodItem" });
        }
      }
    }
  }
}

function generateItems(mapArr: MapTile[][], itemsArr: Item[]) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (mapArr[y][x].type === "stone") {
        const tile = mapArr[y][x];
        if (!tile) continue;
        const possibleItems = surfaceItemMap[tile.type];
        if (!possibleItems || possibleItems.length === 0) continue;
        if (Math.random() < 0.2) {
          const type = possibleItems[Math.floor(Math.random() * possibleItems.length)];
          const item = itemsArr.find((item: any) => item.x === x && item.y === y)
          if (!item) {
            itemsArr.push({ x, y, type });
          }
        }
      }
    }
  }
}

// === расширенная генерация леса ===
function generateForests(mapArr: MapTile[][]) {
  for (let i = 0; i < 5; i++) { // несколько "очагов леса"
    let gx = Math.floor(Math.random() * MAP_WIDTH);
    let gy = Math.floor(Math.random() * MAP_HEIGHT);

    for (let len = 0; len < 20; len++) {
      if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) {
        if (mapArr[gy][gx].type !== "water" && mapArr[gy][gx].type !== "sand") {
          mapArr[gy][gx].type = "forest";
        }
      }
      gx += Math.floor(Math.random() * 3) - 1;
      gy += Math.floor(Math.random() * 3) - 1;
    }
  }
}

// === предметы по тайлам ===
const surfaceItemMap: Record<string, string[]> = {
  grass: ["fiber", "herb", "eggItem", "woodItem", "mashroom", "bad_mashroom"],
  forest: ["woodItem", "fiber", "herb", "hide", "stoneItem", "deciduous_tree"],
  stone: ["stoneItem", "iron_ore", "copper_ore", "coal", "gold_ore"],
  sand: ["clay", "reed", "shell"],
  water: ["fish", "reed"]
};

// === генерация предметов по тайлам ===
function generateItemsOnMapBySurface(mapArr: MapTile[][], numItems: number = 15): Item[] {
  const itemsArr: Item[] = [];
  let attempts = 0;

  while (itemsArr.length < numItems && attempts < 1000) {

    attempts++;
    const x = Math.floor(Math.random() * MAP_WIDTH);
    const y = Math.floor(Math.random() * MAP_HEIGHT);
    const tile = mapArr[y][x];

    const item = itemsArr.find((item: any) => item.x === x && item.y === y)
    if (item) {
      continue;
    }

    if (!tile) continue;
    const possibleItems = surfaceItemMap[tile.type];
    if (!possibleItems || possibleItems.length === 0) continue;

    const m = {
      "stone": 0.5,
      "tree": 0.9,
    }

    if (Math.random() < (m[tile.type] || 0.2)) {
      const type = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      itemsArr.push({ x, y, type });
    }
  }

  return itemsArr;
}

// === генерация гор ===
function generateMountains(
  mapArr: MapTile[][],
  chunkX: number,
  chunkY: number,
  riverPositions?: number[]
) {
  const key = `${chunkX}_${chunkY}`;
  const numRanges = Math.floor(Math.random() * 10);
  const ranges: { x: number; y: number }[] = [];
  const borders: { x: number; y: number }[] = [];

  for (let r = 0; r < numRanges; r++) {
    let length = Math.floor(Math.random() * 15) + 15;
    let x = r*2;
    let y = Math.floor(Math.random() * MAP_HEIGHT);

    if (riverPositions && riverPositions.length > 0) {
      const midX = Math.floor(riverPositions.length / 2);
      x = Math.max(0, Math.min(MAP_WIDTH - 1, midX + (Math.random() < 0.5 ? -8 : 8)));
    }

    while (length > 0 && x < MAP_WIDTH) {
      if (!mapArr[y] || !mapArr[y][x]) break;
      if (mapArr[y][x].type === "water") {
        if (y > 0 && mapArr[y - 1][x].type !== "water") {
          y -= 3;
        } else if (y < MAP_HEIGHT - 1 && mapArr[y + 1][x].type !== "water") {
          y += 3;
        } else {
          x++;
          continue;
        }
      }

      let isRock = Math.random() < 0.7;

      if (isRock) {
        safeSetTile(mapArr, x, y, "rock");
        // вокруг скалы — камни
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (mapArr[ny] && mapArr[ny][nx] && mapArr[ny][nx].type === "grass") {
              safeSetTile(mapArr, nx, ny, "stone");
            }
          }
        }
      } else {
        safeSetTile(mapArr, x, y, "stone");
        // вокруг камня — лес
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (mapArr[ny] && mapArr[ny][nx] && mapArr[ny][nx].type === "grass") {
              safeSetTile(mapArr, nx, ny, "forest");
            }
          }
        }
      }

      if (x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
        borders.push({ x, y });
      }

      x++;
      length--;
    }

    ranges.push({ x, y });
  }

  chunkMountains[key] = { ranges, borders };
}


export function generateMap(chunkX: number, chunkY: number): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    mapArr[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      mapArr[y][x] = { type: "grass" };
    }
  }

  const leftKey = `${chunkX - 1}_${chunkY}`;
  const rightKey = `${chunkX + 1}_${chunkY}`;
  const topKey = `${chunkX}_${chunkY - 1}`;
  const bottomKey = `${chunkX}_${chunkY + 1}`;

  let riverPositions: number[] | undefined;

  if (chunkRivers[leftKey] || chunkRivers[rightKey] || (chunkY % 3 === 0)) {
    let entryY = Math.floor(MAP_HEIGHT / 2);

    if (chunkRivers[leftKey]) {
      entryY = chunkRivers[leftKey].positions[MAP_WIDTH - 1];
    } else if (chunkRivers[rightKey]) {
      entryY = chunkRivers[rightKey].positions[0];
    } else if (chunkRivers[topKey]) {
      entryY = chunkRivers[topKey].positions[MAP_HEIGHT - 1];
    }

    riverPositions = [];
    let ry = entryY;

    for (let x = 0; x < MAP_WIDTH; x++) {
      safeSetTile(mapArr, x, ry - 1, "water");
      safeSetTile(mapArr, x, ry, "water");
      safeSetTile(mapArr, x, ry + 1, "water");

      riverPositions.push(ry);
      if (Math.random() < 0.7) ry += Math.floor(Math.random() * 3) - 1;
      ry = Math.max(1, Math.min(MAP_HEIGHT - 2, ry));
    }

    chunkRivers[`${chunkX}_${chunkY}`] = { positions: riverPositions, borders: [{ x: MAP_WIDTH - 1, y: ry }] };
  }

  generateMountains(mapArr, chunkX, chunkY, riverPositions);
  generateForests(mapArr);
  generateTrees(mapArr, itemsArr);
  generateItems(mapArr, itemsArr);
  const surfaceItems = generateItemsOnMapBySurface(mapArr, 20);
  itemsArr.push(...surfaceItems);

  return { map: mapArr, items: itemsArr };
}
