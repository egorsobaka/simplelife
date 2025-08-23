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

export function generateMap(chunkX: number, chunkY: number): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];

  const TILE_TYPES = ["grass", "water", "tree", "stone", "shore_top", "shore_bottom", "shore_left", "shore_right"];

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
  if (chunkRivers[leftKey]) entryY = chunkRivers[leftKey].positions[MAP_WIDTH - 1];

  const riverPositions: number[] = [];
  let ry = entryY;

  for (let x = 0; x < MAP_WIDTH; x++) {
    const top = Math.max(0, ry - 1);
    const center = Math.max(0, ry);
    const bottom = Math.min(MAP_HEIGHT - 1, ry + 1);

    mapArr[top][x].type = "water";
    mapArr[center][x].type = "water";
    mapArr[bottom][x].type = "water";

    if (top > 0 && mapArr[top - 1][x].type === "grass") mapArr[top - 1][x].type = "shore_top";
    if (bottom < MAP_HEIGHT - 1 && mapArr[bottom + 1][x].type === "grass") mapArr[bottom + 1][x].type = "shore_bottom";

    if (x === 0 && mapArr[center][x].type === "water") mapArr[center][x].type = "shore_left";
    if (x === MAP_WIDTH - 1 && mapArr[center][x].type === "water") mapArr[center][x].type = "shore_right";

    riverPositions.push(center);

    if (Math.random() < 0.4) ry += Math.floor(Math.random() * 3) - 1;
    ry = Math.max(1, Math.min(MAP_HEIGHT - 2, ry));
  }

  chunkRivers[`${chunkX}_${chunkY}`] = { positions: riverPositions };

  // камни
  for (let i = 0; i < 5; i++) {
    let gx = Math.floor(Math.random() * MAP_WIDTH);
    let gy = Math.floor(Math.random() * MAP_HEIGHT);
    for (let len = 0; len < 8; len++) {
      if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) mapArr[gy][gx].type = "stone";
      gx += Math.floor(Math.random() * 3) - 1;
      gy += Math.floor(Math.random() * 3) - 1;
    }
  }

  // лес по периметру
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if ((y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) && mapArr[y][x].type === "grass") {
        if (Math.random() < 0.4) mapArr[y][x].type = "tree";
      }
    }
  }

  // предметы на траве
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (mapArr[y][x].type === "grass" && Math.random() < 0.05) {
        let itemType = Math.random() < 0.33 ? "woodItem" : Math.random() < 0.5 ? "stoneItem" : "eggItem";
        itemsArr.push({ x, y, type: itemType });
      }
    }
  }

  return { map: mapArr, items: itemsArr };
}
