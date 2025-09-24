import { AssetLoader } from '../../utils/assetLoader';

export const terrainTypes = {
  WATER: 0,
  SAND: 1,
  FOREST: 2,
  MOUNTAIN: 3,
  GRASS: 4,
  ROCK: 5,
  BOTTOM: 6,
};

export class TerrainGenerator {
  public terrainTypes = {
    WATER: 0,
    SAND: 1,
    FOREST: 2,
    MOUNTAIN: 3,
    GRASS: 4,
    ROCK: 5,
    BOTTOM: 6,
  };

  private terrainColors = {
    [this.terrainTypes.WATER]: 0x4444aa,
    [this.terrainTypes.SAND]: 0xddcc88,
    [this.terrainTypes.FOREST]: 0x229922,
    [this.terrainTypes.MOUNTAIN]: 0x118811,
    [this.terrainTypes.GRASS]: 0x44aa44,
    [this.terrainTypes.BOTTOM]: 0x55aa55,
    [this.terrainTypes.ROCK]: 0x5d6d7e,
  };
  // Добавим в класс эти свойства
  private heightMap: Map<string, number[][]> = new Map(); // Кэш высот для чанков
  private terrainSeed: number = Math.random() * 10000;
  private lakeCenters: { x: number, y: number, size: number }[] = [];

  generateChunkTiles(chunkX: number, chunkY: number, chunkSize: number): number[][] {
    const tiles: number[][] = [];
    const heights = this.generateHeightMap(chunkX, chunkY, chunkSize);

    // Сначала создаем базовый ландшафт на основе высот
    for (let y = 0; y < chunkSize; y++) {
      tiles[y] = [];
      for (let x = 0; x < chunkSize; x++) {
        const height = heights[y][x];
        tiles[y][x] = this.getTerrainTypeByHeight(height, chunkX * chunkSize + x, chunkY * chunkSize + y);
      }
    }

    // Добавляем озера
    this.generateLakes(chunkX, chunkY, chunkSize, tiles, heights);

    console.log("this.lakeCenters", this.lakeCenters);

    return tiles;
  }

  private generateHeightMap(chunkX: number, chunkY: number, chunkSize: number): number[][] {
    const chunkKey = `${chunkX},${chunkY}`;

    // Проверяем кэш
    if (this.heightMap.has(chunkKey)) {
      return this.heightMap.get(chunkKey)!;
    }

    const heights: number[][] = [];
    const worldStartX = chunkX * chunkSize;
    const worldStartY = chunkY * chunkSize;

    // Используем шум Перлина для плавных высот
    for (let y = 0; y < chunkSize; y++) {
      heights[y] = [];
      for (let x = 0; x < chunkSize; x++) {
        const worldX = worldStartX + x;
        const worldY = worldStartY + y;

        // Основной шум для крупных форм рельефа
        let noise = this.perlinNoise(worldX * 0.01, worldY * 0.01, this.terrainSeed);

        // Добавляем средние детали
        noise += this.perlinNoise(worldX * 0.05, worldY * 0.05, this.terrainSeed) * 0.5;

        // Добавляем мелкие детали
        noise += this.perlinNoise(worldX * 0.1, worldY * 0.1, this.terrainSeed) * 0.25;

        // Нормализуем к диапазону 0-1
        noise = (noise + 1) / 2;

        // Создаем периодический ландшафт: горы-лес-трава-озеро-трава-лес-горы
        const distanceFromCenter = Math.abs(worldX) + Math.abs(worldY);
        const periodicPattern = Math.sin(distanceFromCenter * 0.1) * 0.3 + 0.5;

        // Комбинируем шум с периодическим паттерном
        heights[y][x] = Math.max(0, Math.min(1, noise * 0.7 + periodicPattern * 0.3));
      }
    }

    // Сглаживаем границы с соседними чанками
    this.smoothChunkBorders(chunkX, chunkY, chunkSize, heights);

    this.heightMap.set(chunkKey, heights);
    return heights;
  }

  private getTerrainTypeByHeight(height: number, worldX: number, worldY: number): number {
    // Периодический ландшафт с высотами
    const periodicValue = (Math.sin(worldX * 0.05) + Math.sin(worldY * 0.05)) * 0.5;
    const adjustedHeight = height + periodicValue * 0.2;

    if (adjustedHeight > 0.8) {
      return this.terrainTypes.ROCK; // Высокие горы
    } else if (adjustedHeight > 0.75) {
      return this.terrainTypes.MOUNTAIN; // Высокие горы
    } else if (adjustedHeight > 0.65) {
      return this.terrainTypes.FOREST; // Лес на склонах
    } else if (adjustedHeight > 0.55) {
      return this.terrainTypes.GRASS; // Лес на склонах
    } else if (adjustedHeight > 0.45) {
      return this.terrainTypes.BOTTOM; // Равнины с травой
    } else if (adjustedHeight > 0.4) {
      return this.terrainTypes.SAND; // Пляж вокруг озер
    } else {
      return this.terrainTypes.WATER; // Вода (озера)
    }
  }

  private generateLakes(chunkX: number, chunkY: number, chunkSize: number, tiles: number[][], heights: number[][]): void {
    const worldStartX = chunkX * chunkSize;
    const worldStartY = chunkY * chunkSize;

    // Генерируем озера только в низменностях
    for (let y = 1; y < chunkSize - 1; y++) {
      for (let x = 1; x < chunkSize - 1; x++) {
        const height = heights[y][x];
        const worldX = worldStartX + x;
        const worldY = worldStartY + y;

        // Озера только в низких точках, окруженных более высокими
        if (height < 0.3 && this.isLocalMinimum(heights, x, y)) {
          // Проверяем шанс создания озера
          const lakeChance = this.hash(worldX, worldY) % 100;
          if (lakeChance < 5) { // 5% шанс
            this.createLake(worldX, worldY, chunkX, chunkY, chunkSize, tiles, heights);
          }
        }
      }
    }
  }

  private createLake(centerX: number, centerY: number, chunkX: number, chunkY: number,
    chunkSize: number, tiles: number[][], heights: number[][]): void {
    console.log("heights", heights)
    const lakeSize = 10 + Math.floor(this.hash(centerX, centerY) % 20); // 10-30 тайлов
    const lakeShape = this.hash(centerX + 1, centerY) % 3; // Разная форма

    for (let dy = -lakeSize; dy <= lakeSize; dy++) {
      for (let dx = -lakeSize; dx <= lakeSize; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        let inLake = false;

        // Разные формы озер
        switch (lakeShape) {
          case 0: // Круглое
            inLake = distance < lakeSize * 0.8;
            break;
          case 1: // Овальное
            inLake = (dx * dx) / (lakeSize * lakeSize) + (dy * dy) / (lakeSize * 0.6 * lakeSize * 0.6) < 1;
            break;
          case 2: // Неровное
            inLake = distance < lakeSize * (0.7 + Math.sin(dx * 0.5) * 0.3);
            break;
        }

        if (inLake) {
          const worldX = centerX + dx;
          const worldY = centerY + dy;
          const localX = worldX - chunkX * chunkSize;
          const localY = worldY - chunkY * chunkSize;

          if (localX >= 0 && localX < chunkSize && localY >= 0 && localY < chunkSize) {
            tiles[localY][localX] = this.terrainTypes.WATER;

            // Добавляем песок вокруг озера
            if (distance < lakeSize * 0.8 + 2 && distance >= lakeSize * 0.8) {
              tiles[localY][localX] = this.terrainTypes.SAND;
            }
          }
        }
      }
    }
  }

  private isLocalMinimum(heights: number[][], x: number, y: number): boolean {
    const height = heights[y][x];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < heights.length && nx >= 0 && nx < heights[0].length) {
          if (heights[ny][nx] < height) return false;
        }
      }
    }
    return true;
  }

  private smoothChunkBorders(chunkX: number, chunkY: number, chunkSize: number, heights: number[][]): void {
    // Сглаживаем границы с соседними чанками для непрерывности
    for (let i = 0; i < chunkSize; i++) {
      // Верхняя граница
      const topHeight = this.getHeightFromNeighbor(chunkX, chunkY - 1, chunkSize, i, chunkSize - 1);
      if (topHeight !== null) {
        heights[0][i] = (heights[0][i] + topHeight) / 2;
      }

      // Нижняя граница
      const bottomHeight = this.getHeightFromNeighbor(chunkX, chunkY + 1, chunkSize, i, 0);
      if (bottomHeight !== null) {
        heights[chunkSize - 1][i] = (heights[chunkSize - 1][i] + bottomHeight) / 2;
      }

      // Левая граница
      const leftHeight = this.getHeightFromNeighbor(chunkX - 1, chunkY, chunkSize, chunkSize - 1, i);
      if (leftHeight !== null) {
        heights[i][0] = (heights[i][0] + leftHeight) / 2;
      }

      // Правая граница
      const rightHeight = this.getHeightFromNeighbor(chunkX + 1, chunkY, chunkSize, 0, i);
      if (rightHeight !== null) {
        heights[i][chunkSize - 1] = (heights[i][chunkSize - 1] + rightHeight) / 2;
      }
    }
  }

  private getHeightFromNeighbor(neighborX: number, neighborY: number, chunkSize: number,
    localX: number, localY: number): number | null {
    const neighborKey = `${neighborX},${neighborY}`;
    if (this.heightMap.has(neighborKey)) {
      const neighborHeights = this.heightMap.get(neighborKey)!;
      if (localY >= 0 && localY < chunkSize && localX >= 0 && localX < chunkSize) {
        return neighborHeights[localY][localX];
      }
    }
    return null;
  }

  // Простой шум Перлина (упрощенная версия)
  private perlinNoise(x: number, y: number, seed: number): number {
    // Упрощенная реализация шума
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const n00 = this.grad(this.hash(X, Y, seed), x, y);
    const n01 = this.grad(this.hash(X, Y + 1, seed), x, y - 1);
    const n10 = this.grad(this.hash(X + 1, Y, seed), x - 1, y);
    const n11 = this.grad(this.hash(X + 1, Y + 1, seed), x - 1, y - 1);

    const x1 = this.lerp(u, n00, n10);
    const x2 = this.lerp(u, n01, n11);

    return this.lerp(v, x1, x2);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const grad = 1 + (h & 7);
    return ((h & 8) ? -grad : grad) * x + ((h & 4) ? -grad : grad) * y;
  }

  private hash(x: number, y: number, seed: number = this.terrainSeed): number {
    return Math.abs(Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1;
  }

  generateMountainRanges(chunkX: number, chunkY: number, chunkSize: number, tiles: number[][]): void {
    const worldStartX = chunkX * chunkSize;
    const worldStartY = chunkY * chunkSize;
    const worldEndX = worldStartX + chunkSize;
    const worldEndY = worldStartY + chunkSize;

    // Генерируем от 0 до 5 горных гряд
    const numRanges = Math.floor(Math.random() * 6); // 0-5

    for (let i = 0; i < numRanges; i++) {
      this.generateSingleMountainRange(worldStartX, worldStartY, worldEndX, worldEndY, chunkSize, tiles);
    }
  }

  generateSingleMountainRange(worldStartX: number, worldStartY: number, worldEndX: number, worldEndY: number, chunkSize: number, tiles: number[][]): void {
    // Определяем параметры гряды
    const width = 3 + Math.floor(Math.random() * 8); // 3-10 тайлов
    const length = 20 + Math.floor(Math.random() * 30); // 20-50 тайлов

    // Начальная точка гряды (в мировых координатах)
    const startX = worldStartX + Math.floor(Math.random() * chunkSize);
    const startY = worldStartY + Math.floor(Math.random() * chunkSize);

    // Угол направления гряды
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    // Создаем гряду
    for (let pos = 0; pos < length; pos++) {
      const centerX = startX + dx * pos;
      const centerY = startY + dy * pos;

      // Рисуем поперечное сечение гряды
      for (let w = -width; w <= width; w++) {
        // Перпендикулярное направление
        const perpX = -dy * w;
        const perpY = dx * w;

        const mountainX = Math.round(centerX + perpX);
        const mountainY = Math.round(centerY + perpY);

        // Проверяем, попадает ли точка в текущий чанк
        if (mountainX >= worldStartX && mountainX < worldEndX &&
          mountainY >= worldStartY && mountainY < worldEndY) {

          const localX = mountainX - worldStartX;
          const localY = mountainY - worldStartY;

          // Заменяем тайл на гору (если это не вода)
          if (tiles[localY][localX] !== this.terrainTypes.WATER) {
            tiles[localY][localX] = this.terrainTypes.MOUNTAIN;
          }
        }
      }
    }
  }

  getTerrainColor(terrainType: number): number {
    return this.terrainColors[terrainType] || 0x44aa44;
  }

  canSpawnItem(terrainType: number, itemType: string): boolean {
    switch (itemType) {
      case 'star':
        return [this.terrainTypes.FOREST, this.terrainTypes.MOUNTAIN, this.terrainTypes.ROCK].includes(terrainType);
      case 'wood':
        return terrainType === this.terrainTypes.FOREST;
      case 'stone':
        return terrainType === this.terrainTypes.MOUNTAIN;
      case 'gold_vein':
        return terrainType === this.terrainTypes.MOUNTAIN;
      case 'mushroom':
        return [this.terrainTypes.FOREST].includes(terrainType);
      case 'poisonmushroom':
        return terrainType === this.terrainTypes.FOREST;
      case 'mushroom_rare':
        return terrainType === this.terrainTypes.FOREST;
      default:
        return false;
    }
  }

  canSpawnObstacle(terrainType: number, obstacleType: string): boolean {
    switch (obstacleType) {
      case 'tree':
        return terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.GRASS || terrainType === this.terrainTypes.BOTTOM;
      case 'rock':
        return terrainType === this.terrainTypes.MOUNTAIN || terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.ROCK;
      case 'mountain':
        return terrainType === this.terrainTypes.MOUNTAIN || terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.ROCK;
      case 'bush':
        return terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.GRASS || terrainType === this.terrainTypes.SAND || terrainType === this.terrainTypes.BOTTOM;
      default:
        return false;
    }
  }

  getObstacleConfig(obstacleType: string): {
    sprite: string[];
    isSolid: boolean;
    canInteract: boolean
  } {
    // Получаем все доступные спрайты для этого типа
    const availableSprites = AssetLoader.getAllAssets(obstacleType);

    const configs = {
      tree: {
        sprite: availableSprites.length > 0 ? availableSprites : ['tree'],
        isSolid: true,
        canInteract: true
      },
      rock: {
        sprite: availableSprites.length > 0 ? availableSprites : ['rock'],
        isSolid: true,
        canInteract: true
      },
      bush: {
        sprite: availableSprites.length > 0 ? availableSprites : ['bush'],
        isSolid: true,
        canInteract: true
      },
      mountain: {
        sprite: availableSprites.length > 0 ? availableSprites : ['mountain'],
        isSolid: true,
        canInteract: false
      },
      stone: {
        sprite: availableSprites.length > 0 ? availableSprites : ['stone'],
        isSolid: true,
        canInteract: false
      },
      star: {
        sprite: AssetLoader.getAllAssets('star'),
        isSolid: false, // Дрова проходимы
        canInteract: true,
        itemType: 'star',
        itemQuantity: 3 // Дает 3 единицы дерева
      },
      wood: {
        sprite: AssetLoader.getAllAssets('wood'),
        isSolid: false, // Дрова проходимы
        canInteract: true,
        itemType: 'wood',
        itemQuantity: 3 // Дает 3 единицы дерева
      },
      twig: {
        sprite: ['wood-3'], // Ветки
        isSolid: false,
        canInteract: true,
        itemType: 'wood',
        itemQuantity: 1 // Дает 1 единицу дерева
      },
      gold_vein: {
        sprite: ['stone-gold'],
        isSolid: true,
        canInteract: true,
        itemType: 'gold_ore' // Редкий предмет
      },
      mushroom: {
        sprite: AssetLoader.getAllAssets('mushroom'),
        isSolid: false,
        canInteract: true,
        itemType: 'mushroom',
        itemQuantity: 1,
        isEdible: true,
        healthEffect: 10
      },
      poisonmushroom: {
        sprite: AssetLoader.getAllAssets('poisonmushroom'),
        isSolid: false,
        canInteract: true,
        itemType: 'poisonmushroom',
        itemQuantity: 1,
        isEdible: false,
        healthEffect: -20
      },
      mushroom_rare: {
        sprite: AssetLoader.getAllAssets('mushroom'),
        isSolid: false,
        canInteract: true,
        itemType: 'mushroom_rare',
        itemQuantity: 1,
        isEdible: true,
        healthEffect: 25
      },
    };

    return configs[obstacleType as keyof typeof configs] || {
      sprite: ['default_obstacle'],
      isSolid: true,
      canInteract: false
    };
  }
}