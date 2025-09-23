import { AssetLoader } from '../../utils/assetLoader';

export class TerrainGenerator {
  private terrainTypes = {
    WATER: 0,
    SAND: 1,
    FOREST: 2,
    MOUNTAIN: 3,
    GRASS: 4
  };

  private terrainColors = {
    [this.terrainTypes.WATER]: 0x4444aa,
    [this.terrainTypes.SAND]: 0xddcc88,
    [this.terrainTypes.FOREST]: 0x226622,
    [this.terrainTypes.MOUNTAIN]: 0x5d6d7e,
    [this.terrainTypes.GRASS]: 0x44aa44
  };

  generateChunkTiles(chunkX: number, chunkY: number, chunkSize: number): number[][] {
    const tiles: number[][] = [];

    for (let y = 0; y < chunkSize; y++) {
      tiles[y] = [];
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldY = chunkY * chunkSize + y;

        const distance = Math.sqrt(worldX * worldX + worldY * worldY);

        if (distance < 5) {
          tiles[y][x] = this.terrainTypes.WATER;
        } else if (distance < 15) {
          tiles[y][x] = this.terrainTypes.SAND;
        } else if (distance < 30) {
          tiles[y][x] = this.terrainTypes.FOREST;
        } else if (distance < 50) {
          tiles[y][x] = this.terrainTypes.MOUNTAIN;
        } else {
          tiles[y][x] = this.terrainTypes.GRASS;
        }
      }
    }

    return tiles;
  }

  getTerrainColor(terrainType: number): number {
    return this.terrainColors[terrainType] || 0x44aa44;
  }

  canSpawnItem(terrainType: number, itemType: string): boolean {
    switch (itemType) {
      case 'star':
        return [this.terrainTypes.FOREST, this.terrainTypes.GRASS, this.terrainTypes.SAND].includes(terrainType);
      case 'wood':
        return terrainType === this.terrainTypes.FOREST;
      case 'stone':
        return terrainType === this.terrainTypes.MOUNTAIN;
      case 'gold_vein':
        return terrainType === this.terrainTypes.MOUNTAIN;
      case 'mushroom':
        return [this.terrainTypes.FOREST, this.terrainTypes.GRASS, this.terrainTypes.SAND].includes(terrainType);
      case 'mushroom_poison':
        return terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.GRASS;
      case 'mushroom_rare':
        return terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.GRASS;
      default:
        return false;
    }
  }

  canSpawnObstacle(terrainType: number, obstacleType: string): boolean {
    switch (obstacleType) {
      case 'tree':
        return terrainType === this.terrainTypes.FOREST;
      case 'rock':
        return terrainType === this.terrainTypes.MOUNTAIN;
      case 'bush':
        return terrainType === this.terrainTypes.FOREST || terrainType === this.terrainTypes.GRASS;
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
      mushroom_poison: {
        sprite: ['mushroom-1', 'mushroom-5'], // Ядовитые грибы
        isSolid: false,
        canInteract: true,
        itemType: 'mushroom_poison',
        itemQuantity: 1,
        isEdible: false,
        healthEffect: -20
      },
      mushroom_rare: {
        sprite: ['mushroom-2'], // Ценные грибы
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