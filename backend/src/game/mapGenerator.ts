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
const chunkRivers: Record<string, { positions: number[] }> = {};
const chunkMountains: Record<string, { x: number }> = {};

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
      if (mapArr[y][x].type === "forest") {
        if (Math.random() < 0.9) {
          itemsArr.push({ x, y, type: "woodItem" });
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
      // блуждание "пятна леса"
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

    if (!tile) continue;
    const possibleItems = surfaceItemMap[tile.type];
    if (!possibleItems || possibleItems.length === 0) continue;

    if (Math.random() < 0.5) { // вероятность спавна
      const type = possibleItems[Math.floor(Math.random() * possibleItems.length)];
      itemsArr.push({ x, y, type });
    }
  }

  return itemsArr;
}

// === генерация гор ===
function generateMountains(mapArr: MapTile[][], chunkX: number, chunkY: number, riverPositions?: number[]) {
  const leftKey = `${chunkX - 1}_${chunkY}`;
  const rightKey = `${chunkX + 1}_${chunkY}`;
  let mountainX: number;

  // если в соседнем чанке уже есть горы — продолжаем
  if (chunkMountains[leftKey]) {
    mountainX = chunkMountains[leftKey].x;
  } else if (chunkMountains[rightKey]) {
    mountainX = chunkMountains[rightKey].x;
  } else {
    // если есть река — ставим горы на расстоянии ±3–5 клеток от середины
    if (riverPositions) {
      const midX = Math.floor(riverPositions.length / 2);
      mountainX = Math.max(2, Math.min(MAP_WIDTH - 3, midX + (Math.random() < 0.5 ? -4 : 4)));
    } else {
      // случайно по центру
      mountainX = Math.floor(MAP_WIDTH / 2) + Math.floor(Math.random() * 5) - 2;
    }
  }

  // сохранить горы для текущего чанка
  chunkMountains[`${chunkX}_${chunkY}`] = { x: mountainX };

  // строим горы сверху вниз
  for (let y = 0; y < MAP_HEIGHT; y++) {
    if (mapArr[y][mountainX].type === "water") continue;
    if (Math.random() < 0.8) {
      mountainX + 1 < 20 && mountainX++;
    } else
      if (Math.random() < 0.3) {
        mountainX - 1 >= 0 && mountainX--;
      }
    if (Math.random() < 0.8) {
      safeSetTile(mapArr, mountainX, y, "rock");
      if (mapArr[y - 1] && mapArr[y - 1][mountainX].type !== "rock") {
        safeSetTile(mapArr, mountainX, y - 1, "stone");
      }
      if (mapArr[y + 1] && mapArr[y + 1][mountainX].type !== "rock") {
        safeSetTile(mapArr, mountainX, y + 1, "stone");
      }
    } else {
      safeSetTile(mapArr, mountainX, y, "stone");
    }

    safeSetTile(mapArr, mountainX - 1, y, "stone");
    safeSetTile(mapArr, mountainX + 1, y, "stone");

    if (mountainX - 2 >= 0 && mapArr[y][mountainX - 2].type === "grass") {
      safeSetTile(mapArr, mountainX - 2, y, "forest");
    }
    if (mountainX + 2 < MAP_WIDTH && mapArr[y][mountainX + 2].type === "grass") {
      safeSetTile(mapArr, mountainX + 2, y, "forest");
    }
  }
}

export function generateMap(chunkX: number, chunkY: number): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];

  // создаём карту с травой
  for (let y = 0; y < MAP_HEIGHT; y++) {
    mapArr[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      mapArr[y][x] = { type: "grass" };
    }
  }

  const leftKey = `${chunkX - 1}_${chunkY}`;
  const rightKey = `${chunkX + 1}_${chunkY}`;
  let riverPositions: number[] | undefined;

  if (chunkRivers[leftKey] || chunkRivers[rightKey] || (chunkY % 3 === 0)) {
    let entryY = Math.floor(MAP_HEIGHT / 2);

    if (chunkRivers[leftKey]) {
      entryY = chunkRivers[leftKey].positions[MAP_WIDTH - 1];
    } else if (chunkRivers[rightKey]) {
      entryY = chunkRivers[rightKey].positions[MAP_WIDTH - 1];
    }

    riverPositions = [];
    let ry = entryY;

    for (let x = 0; x < MAP_WIDTH; x++) {
      const top = ry - 1;
      const center = ry;
      const bottom = ry + 1;

      safeSetTile(mapArr, x, top, "water");
      safeSetTile(mapArr, x, center, "water");
      safeSetTile(mapArr, x, bottom, "water");

      if (top > 0) safeSetTile(mapArr, x, top - 1, "shore_top");
      if (bottom < MAP_HEIGHT - 1) safeSetTile(mapArr, x, bottom + 1, "shore_bottom");

      if (x === 0) safeSetTile(mapArr, x, center, "shore_left");
      if (x === MAP_WIDTH - 1) safeSetTile(mapArr, x, center, "shore_right");

      riverPositions.push(center);

      if (Math.random() < 0.4) ry += Math.floor(Math.random() * 3) - 1;
      ry = Math.max(1, Math.min(MAP_HEIGHT - 2, ry));
    }

    chunkRivers[`${chunkX}_${chunkY}`] = { positions: riverPositions };

    // мостик из песка
    const bridgeX = Math.floor(Math.random() * MAP_WIDTH);
    const bridgeY = riverPositions[bridgeX];
    for (let dy = -2; dy <= 2; dy++) {
      if (bridgeY + dy > 0 && bridgeY + dy < MAP_HEIGHT) {
        safeSetTile(mapArr, bridgeX, bridgeY + dy, "sand");
      }
    }
  }

  // горы (перпендикулярно реке)
  generateMountains(mapArr, chunkX, chunkY, riverPositions);

  // расширяем лес внутри карты
  generateForests(mapArr);

  // генерируем деревья на лесных клетках
  generateTrees(mapArr, itemsArr);

  // генерируем предметы по тайлам
  const surfaceItems = generateItemsOnMapBySurface(mapArr, 20);
  itemsArr.push(...surfaceItems);

  return { map: mapArr, items: itemsArr };
}
