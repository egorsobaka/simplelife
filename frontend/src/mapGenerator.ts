import Phaser from "phaser";

export const TILE_SIZE = 32;
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 40;
export const LAND_SPRITE_SIZE = 16;

export interface MapTile {
  sprite: Phaser.GameObjects.Image;
  type: string;
}

export interface Item {
  x: number;
  y: number;
  type: string;
  sprite: Phaser.GameObjects.Image;
}

const chunkRivers: Record<string, { positions: number[] }> = {};

export function generateMap(
  scene: Phaser.Scene,
  chunkX: number,
  chunkY: number
): { map: MapTile[][]; items: Item[] } {
  const mapArr: MapTile[][] = [];
  const itemsArr: Item[] = [];
  const TILE_INDEX: Record<string, number> = {
    grass: 5,
    water: 0,
    tree: 66,
    stone: 7,
    woodItem: 526,
    eggItem: 563,
    stoneItem: 210,
    shore_top: 3,
    shore_bottom: 117,
    shore_left: 60,
    shore_right: 62,
  };

  // создаём карту с травой
  for (let y = 0; y < MAP_HEIGHT; y++) {
    mapArr[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      mapArr[y][x] = { sprite: null as any, type: "grass" };
    }
  }

  // река горизонтальная слева направо
  const leftKey = `${chunkX - 1}_${chunkY}`;
  let entryY = Math.floor(MAP_HEIGHT / 2); 
  if (chunkRivers[leftKey]) entryY = chunkRivers[leftKey].positions[MAP_WIDTH - 1];

  const riverPositions: number[] = [];
  let ry = entryY;

  for (let x = 0; x < MAP_WIDTH; x++) {
    const top = Phaser.Math.Clamp(ry - 1, 0, MAP_HEIGHT - 1);
    const center = Phaser.Math.Clamp(ry, 0, MAP_HEIGHT - 1);
    const bottom = Phaser.Math.Clamp(ry + 1, 0, MAP_HEIGHT - 1);

    // река
    mapArr[top][x].type = "water";
    mapArr[center][x].type = "water";
    mapArr[bottom][x].type = "water";

    // верхний и нижний берега
    if (top > 0 && mapArr[top - 1][x].type === "grass") mapArr[top - 1][x].type = "shore_top";
    if (bottom < MAP_HEIGHT - 1 && mapArr[bottom + 1][x].type === "grass") mapArr[bottom + 1][x].type = "shore_bottom";

    // левый и правый берега для центрального ряда
    if (x === 0 && mapArr[center][x].type === "water") mapArr[center][x].type = "shore_left";
    if (x === MAP_WIDTH - 1 && mapArr[center][x].type === "water") mapArr[center][x].type = "shore_right";

    riverPositions.push(center);

    if (Math.random() < 0.4) ry += Phaser.Math.Between(-1, 1);
    ry = Phaser.Math.Clamp(ry, 1, MAP_HEIGHT - 2);
  }

  chunkRivers[`${chunkX}_${chunkY}`] = { positions: riverPositions };

  // камни
  for (let i = 0; i < 5; i++) {
    let gx = Phaser.Math.Between(0, MAP_WIDTH - 1);
    let gy = Phaser.Math.Between(0, MAP_HEIGHT - 1);
    for (let len = 0; len < 8; len++) {
      if (gx >= 0 && gy >= 0 && gx < MAP_WIDTH && gy < MAP_HEIGHT) mapArr[gy][gx].type = "stone";
      gx += Phaser.Math.Between(-1, 1);
      gy += Phaser.Math.Between(-1, 1);
    }
  }

  // лес по периметру чанка
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if ((y === 0 || y === MAP_HEIGHT - 1 || x === 0 || x === MAP_WIDTH - 1) && mapArr[y][x].type === "grass") {
        if (Math.random() < 0.4) mapArr[y][x].type = "tree";
      }
    }
  }

  // создаём спрайты тайлов
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const type = mapArr[y][x].type;
      const tile = scene.add
        .image(x * TILE_SIZE, y * TILE_SIZE, "tiles", TILE_INDEX[type])
        .setOrigin(0)
        .setScale(TILE_SIZE / LAND_SPRITE_SIZE, TILE_SIZE / LAND_SPRITE_SIZE)
        .setDepth(type.startsWith("shore") ? 2 : 1);
      mapArr[y][x].sprite = tile;

      // генерация предметов на траве
      if (type === "grass" && Math.random() < 0.05) {
        let itemType = Math.random() < 0.5 ? "woodItem" : "stoneItem";
        if (Math.random() < 0.5) itemType = "eggItem";
        const itemSprite = scene.add
          .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "tiles", TILE_INDEX[itemType])
          .setOrigin(0.5)
          .setScale(TILE_SIZE / 17, TILE_SIZE / 17)
          .setDepth(10);
        itemsArr.push({ x, y, type: itemType, sprite: itemSprite });
      }
    }
  }

  return { map: mapArr, items: itemsArr };
}
