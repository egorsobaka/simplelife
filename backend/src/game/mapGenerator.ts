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

// Глобальное хранилище речной системы
let riverSystem: {
  sourceChunk: { x: number; y: number };
  direction: 'horizontal' | 'vertical';
  path: Set<string>;
} | null = null;

// Глобальные данные для рек и гор по чанкам
const chunkRivers: Record<string, RiverData> = {};
const chunkMountains: Record<string, { ranges: { x: number; y: number }[]; borders: { x: number; y: number }[] }> = {};

// Интерфейсы для рек
interface RiverData {
  positions: number[];
  entryDirection: RiverDirection;
  exitDirection: RiverDirection;
  entryX: number;
  entryY: number;
  exitX: number;
  exitY: number;
}

type RiverDirection = 'left' | 'right' | 'top' | 'bottom';

// безопасно установить тайл
function safeSetTile(mapArr: MapTile[][], x: number, y: number, type: string) {
  if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
    if (!mapArr[y][x]) {
      mapArr[y][x] = { type: "grass" };
    }
    mapArr[y][x].type = type;
  }
}

// === генерация реки ===
function generateRiver(mapArr: MapTile[][], chunkX: number, chunkY: number): number[] | undefined {
  const leftKey = `${chunkX - 1}_${chunkY}`;
  const rightKey = `${chunkX + 1}_${chunkY}`;
  const topKey = `${chunkX}_${chunkY - 1}`;
  const bottomKey = `${chunkX}_${chunkY + 1}`;

  // Проверяем, есть ли река в соседних чанках
  const hasRiverFromLeft = chunkRivers[leftKey];
  const hasRiverFromRight = chunkRivers[rightKey];
  const hasRiverFromTop = chunkRivers[topKey];
  const hasRiverFromBottom = chunkRivers[bottomKey];

  const neighboringRivers = [
    hasRiverFromLeft ? 'left' : null,
    hasRiverFromRight ? 'right' : null,
    hasRiverFromTop ? 'top' : null,
    hasRiverFromBottom ? 'bottom' : null
  ].filter(Boolean) as RiverDirection[];

  // Если нет рек в соседях и мы не создаем новую речную систему
  if (neighboringRivers.length === 0) {
    // С небольшой вероятностью создаем начало новой реки
    if (!riverSystem && Math.random() < 0.1) {
      riverSystem = {
        sourceChunk: { x: chunkX, y: chunkY },
        direction: Math.random() < 0.5 ? 'horizontal' : 'vertical',
        path: new Set([`${chunkX}_${chunkY}`])
      };
    } else if (!riverSystem || !riverSystem.path.has(`${chunkX}_${chunkY}`)) {
      return undefined;
    }
  }

  // Определяем направление входа реки
  let entryDirection: RiverDirection | null = null;
  let exitDirection: RiverDirection | null = null;

  if (neighboringRivers.length > 0) {
    // Если есть реки в соседях, продолжаем существующую
    entryDirection = neighboringRivers[0];
    
    // Определяем противоположное направление для выхода
    const oppositeDirections: Record<RiverDirection, RiverDirection> = {
      'left': 'right',
      'right': 'left',
      'top': 'bottom',
      'bottom': 'top'
    };
    
    // Ищем направление, которое не занято входом
    const possibleExits: RiverDirection[] = ['left', 'right', 'top', 'bottom'].filter(
      dir => dir !== entryDirection && dir !== oppositeDirections[entryDirection!]
    ) as RiverDirection[];
    
    exitDirection = possibleExits[Math.floor(Math.random() * possibleExits.length)];
  } else if (riverSystem) {
    // Создаем новую реку в системе
    if (riverSystem.direction === 'horizontal') {
      entryDirection = 'left';
      exitDirection = 'right';
    } else {
      entryDirection = 'top';
      exitDirection = 'bottom';
    }
  }

  if (!entryDirection || !exitDirection) {
    return undefined;
  }

  // Определяем точки входа и выхода
  let entryX = 0, entryY = 0, exitX = 0, exitY = 0;

  // Устанавливаем точки входа
  if (entryDirection === 'left') {
    entryX = 0;
    entryY = hasRiverFromLeft ? chunkRivers[leftKey].exitY : Math.floor(MAP_HEIGHT / 2);
  } else if (entryDirection === 'right') {
    entryX = MAP_WIDTH - 1;
    entryY = hasRiverFromRight ? chunkRivers[rightKey].exitY : Math.floor(MAP_HEIGHT / 2);
  } else if (entryDirection === 'top') {
    entryY = 0;
    entryX = hasRiverFromTop ? chunkRivers[topKey].exitX : Math.floor(MAP_WIDTH / 2);
  } else {
    entryY = MAP_HEIGHT - 1;
    entryX = hasRiverFromBottom ? chunkRivers[bottomKey].exitX : Math.floor(MAP_WIDTH / 2);
  }

  // Устанавливаем точки выхода
  if (exitDirection === 'left') {
    exitX = 0;
    exitY = Math.floor(MAP_HEIGHT / 2);
  } else if (exitDirection === 'right') {
    exitX = MAP_WIDTH - 1;
    exitY = Math.floor(MAP_HEIGHT / 2);
  } else if (exitDirection === 'top') {
    exitY = 0;
    exitX = Math.floor(MAP_WIDTH / 2);
  } else {
    exitY = MAP_HEIGHT - 1;
    exitX = Math.floor(MAP_WIDTH / 2);
  }

  // Создаем прямую реку между точками
  const riverPositions: number[] = [];
  let currentX = entryX;
  let currentY = entryY;

  // Простой алгоритм Брезенхема для прямой линии
  const dx = Math.abs(exitX - entryX);
  const dy = Math.abs(exitY - entryY);
  const sx = entryX < exitX ? 1 : -1;
  const sy = entryY < exitY ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Рисуем реку шириной 3 тайла
    for (let dyOffset = -1; dyOffset <= 1; dyOffset++) {
      for (let dxOffset = -1; dxOffset <= 1; dxOffset++) {
        if (Math.abs(dxOffset) + Math.abs(dyOffset) <= 1) {
          safeSetTile(mapArr, currentX + dxOffset, currentY + dyOffset, "water");
        }
      }
    }

    riverPositions.push(entryDirection === 'left' || entryDirection === 'right' ? currentY : currentX);

    if (currentX === exitX && currentY === exitY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currentX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currentY += sy;
    }
  }

  // Сохраняем данные реки
  chunkRivers[`${chunkX}_${chunkY}`] = {
    positions: riverPositions,
    entryDirection,
    exitDirection,
    entryX,
    entryY,
    exitX,
    exitY
  };

  // Добавляем в речную систему
  if (riverSystem) {
    riverSystem.path.add(`${chunkX}_${chunkY}`);
  }

  return riverPositions;
}

// === генерация деревьев ===
function generateTrees(mapArr: MapTile[][], itemsArr: Item[]) {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const item = itemsArr.find((item: any) => item.x === x && item.y === y);
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
          const item = itemsArr.find((item: any) => item.x === x && item.y === y);
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
  for (let i = 0; i < 5; i++) {
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

    const item = itemsArr.find((item: any) => item.x === x && item.y === y);
    if (item) {
      continue;
    }

    if (!tile) continue;
    const possibleItems = surfaceItemMap[tile.type];
    if (!possibleItems || possibleItems.length === 0) continue;

    const m = {
      "stone": 0.5,
      "tree": 0.9,
    };

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
  riverPositions?: number[],
  itemsArr?: any,
) {
  const key = `${chunkX}_${chunkY}`;
  const numRanges = Math.floor(Math.random() * 10);
  const ranges: { x: number; y: number }[] = [];
  const borders: { x: number; y: number }[] = [];

  for (let r = 0; r < numRanges; r++) {
    let length = Math.floor(Math.random() * 15) + 15;
    let x = r * 2;
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
        itemsArr.push({ x, y, type: "rock" });
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

// Новая функция генерации леса, избегающая воду
function generateForestsAvoidingWater(mapArr: MapTile[][]) {
  for (let i = 0; i < 3; i++) {
    let gx = Math.floor(Math.random() * MAP_WIDTH);
    let gy = Math.floor(Math.random() * MAP_HEIGHT);

    // Ищем стартовую позицию не в воде
    while (mapArr[gy]?.[gx]?.type === "water") {
      gx = Math.floor(Math.random() * MAP_WIDTH);
      gy = Math.floor(Math.random() * MAP_HEIGHT);
    }

    for (let len = 0; len < 15; len++) {
      if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) {
        if (mapArr[gy][gx].type !== "water" && mapArr[gy][gx].type !== "sand") {
          mapArr[gy][gx].type = "forest";
        }
      }
      
      // Двигаемся, избегая воду
      let attempts = 0;
      let newGx = gx + Math.floor(Math.random() * 3) - 1;
      let newGy = gy + Math.floor(Math.random() * 3) - 1;
      
      while (attempts < 10 && (
        newGx < 0 || newGx >= MAP_WIDTH || 
        newGy < 0 || newGy >= MAP_HEIGHT ||
        mapArr[newGy]?.[newGx]?.type === "water"
      )) {
        newGx = gx + Math.floor(Math.random() * 3) - 1;
        newGy = gy + Math.floor(Math.random() * 3) - 1;
        attempts++;
      }
      
      gx = newGx;
      gy = newGy;
    }
  }
}

export function generateMap(chunkX: number, chunkY: number): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];

  // Инициализируем карту травой
  for (let y = 0; y < MAP_HEIGHT; y++) {
    mapArr[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      mapArr[y][x] = { type: "grass" };
    }
  }

  // Генерируем реку (только если она должна быть в этом чанке)
  const riverPositions = generateRiver(mapArr, chunkX, chunkY);

  // Остальная генерация карты
  generateMountains(mapArr, chunkX, chunkY, riverPositions, itemsArr);
  generateForestsAvoidingWater(mapArr);
  generateTrees(mapArr, itemsArr);
  generateItems(mapArr, itemsArr);
  
  const surfaceItems = generateItemsOnMapBySurface(mapArr, 20).filter(item => {
    const tile = mapArr[item.y]?.[item.x];
    return tile && tile.type !== "water";
  });
  
  itemsArr.push(...surfaceItems);

  return { map: mapArr, items: itemsArr };
}

// Функция для сброса речной системы
export function resetRiverSystem(): void {
  riverSystem = null;
  for (const key in chunkRivers) {
    delete chunkRivers[key];
  }
}