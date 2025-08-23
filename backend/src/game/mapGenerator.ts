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

// для генерации рек и соседних чанков
const chunkRivers: Record<string, { positions: number[] }> = {};

// безопасно установить тайл
function safeSetTile(mapArr: MapTile[][], x: number, y: number, type: string) {
  if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
    if (!mapArr[y][x]) {
      mapArr[y][x] = { type: "grass" };
    }
    mapArr[y][x].type = type;
  }
}

export function generateMap(
  chunkX: number,
  chunkY: number
): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];

  // создаём карту с травой
  for (let y = 0; y < MAP_HEIGHT; y++) {
    mapArr[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      mapArr[y][x] = { type: "grass" };
    }
  }

  // горизонтальная река
  const leftKey = `${chunkX - 1}_${chunkY}`;
  let entryY = Math.floor(MAP_HEIGHT / 2);
  if (chunkRivers[leftKey]) {
    entryY = chunkRivers[leftKey].positions[MAP_WIDTH - 1];
  }

  const riverPositions: number[] = [];
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

    // немного смещаем русло
    if (Math.random() < 0.4) {
      ry += Math.floor(Math.random() * 3) - 1;
    }
    ry = Math.max(1, Math.min(MAP_HEIGHT - 2, ry));
  }

  chunkRivers[`${chunkX}_${chunkY}`] = { positions: riverPositions };

  // камни
  for (let i = 0; i < 5; i++) {
    let gx = Math.floor(Math.random() * MAP_WIDTH);
    let gy = Math.floor(Math.random() * MAP_HEIGHT);
    for (let len = 0; len < 8; len++) {
      if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) {
        safeSetTile(mapArr, gx, gy, "stone");
      }
      gx += Math.floor(Math.random() * 3) - 1;
      gy += Math.floor(Math.random() * 3) - 1;
    }
  }

  // лес по периметру
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (
        (y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) &&
        mapArr[y][x].type === "grass"
      ) {
        if (Math.random() < 0.4) mapArr[y][x].type = "tree";
      }
    }
  }

  // предметы на траве
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (mapArr[y][x].type === "grass" && Math.random() < 0.05) {
        let itemType =
          Math.random() < 0.33
            ? "woodItem"
            : Math.random() < 0.5
            ? "stoneItem"
            : "eggItem";
        itemsArr.push({ x, y, type: itemType });
      }
    }
  }

  return { map: mapArr, items: itemsArr };
}
