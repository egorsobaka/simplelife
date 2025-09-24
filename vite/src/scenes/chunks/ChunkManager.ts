// src/scenes/chunks/ChunkManager.ts
import { TerrainGenerator } from './TerrainGenerator';
import { ItemManager } from '../entities/items/ItemManager';
import { AssetLoader } from '@/utils/assetLoader';

interface Chunk {
  x: number;
  y: number;
  tiles: number[][];
  graphics: Phaser.GameObjects.Graphics;
  obstacles: Phaser.Physics.Arcade.Sprite[];
}

export class ChunkManager {
  private loadedChunks: Map<string, Chunk> = new Map();
  private terrainGenerator: TerrainGenerator;
  private itemManager: ItemManager;
  private scene: Phaser.Scene;
  private chunkSize: number;
  private tileSize: number;
  private itemsGroup: Phaser.Physics.Arcade.Group;
  private obstaclesGroup: Phaser.Physics.Arcade.StaticGroup;

  constructor(scene: Phaser.Scene, itemsGroup: Phaser.Physics.Arcade.Group, obstaclesGroup: Phaser.Physics.Arcade.StaticGroup, chunkSize: number = 40, tileSize: number = 32) {
    this.scene = scene;
    this.itemsGroup = itemsGroup;
    this.obstaclesGroup = obstaclesGroup; // Добавьте это
    this.chunkSize = chunkSize;
    this.tileSize = tileSize;
    this.terrainGenerator = new TerrainGenerator();
    this.itemManager = new ItemManager();
  }

  generateChunk(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;

    if (this.loadedChunks.has(chunkKey)) {
      return;
    }

    const tiles = this.terrainGenerator.generateChunkTiles(chunkX, chunkY, this.chunkSize);
    const graphics = this.scene.add.graphics();
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;

    // Рисуем тайлы чанка
    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const tileType = tiles[y][x];
        const tileX = chunkWorldX + x * this.tileSize;
        const tileY = chunkWorldY + y * this.tileSize;

        graphics.fillStyle(this.terrainGenerator.getTerrainColor(tileType));
        graphics.fillRect(tileX, tileY, this.tileSize, this.tileSize);

        // graphics.lineStyle(1, 0x000000, 0.2);
        // graphics.strokeRect(tileX, tileY, this.tileSize, this.tileSize);
      }
    }

    const obstacles: Phaser.Physics.Arcade.Sprite[] = [];

    const chunk: Chunk = {
      x: chunkX,
      y: chunkY,
      tiles,
      graphics,
      obstacles
    };

    this.loadedChunks.set(chunkKey, chunk);
    this.spawnItemsInChunk(chunkX, chunkY, tiles);
    this.spawnObstaclesInChunk(chunkX, chunkY, tiles);
  }

  private spawnItemsInChunk(chunkX: number, chunkY: number, tiles: number[][]): void {
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;

    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const tileType = tiles[y][x];

        let itemType: string | null = null;
        let spawnChance = 0;

        if (this.terrainGenerator.canSpawnItem(tileType, 'star') && Math.random() < 0.1) {
          itemType = 'star';
          spawnChance = 0.1;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'wood') && Math.random() < 0.2) {
          itemType = 'wood';
          spawnChance = 0.2;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'stone') && Math.random() < 0.15) {
          itemType = 'stone';
          spawnChance = 0.15;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'gold_vein') && Math.random() < 0.15) {
          itemType = 'gold_vein';
          spawnChance = 0.15;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'mushroom') && Math.random() < 0.15) {
          itemType = 'mushroom';
          spawnChance = 0.15;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'mushroom_poison') && Math.random() < 0.15) {
          itemType = 'mushroom_poison';
          spawnChance = 0.15;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'mushroom_rate') && Math.random() < 0.15) {
          itemType = 'mushroom_rate';
          spawnChance = 0.15;
        }

        if (itemType) {
          const itemX = chunkWorldX + x * this.tileSize + this.tileSize / 2;
          const itemY = chunkWorldY + y * this.tileSize + this.tileSize / 2;

          this.createItemEntity(itemType, itemX, itemY);
        }
      }
    }
  }

  private spawnObstaclesInChunk(chunkX: number, chunkY: number, tiles: number[][]): void {
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;
    const chunkKey = `${chunkX},${chunkY}`;
    const chunk = this.loadedChunks.get(chunkKey);

    if (!chunk) return;

    const obstacleTypes = ['tree', 'rock', 'bush', 'mountain'];

    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const tileType = tiles[y][x];

        for (const obstacleType of obstacleTypes) {
          if (this.terrainGenerator.canSpawnObstacle(tileType, obstacleType)) {

            const spawnChance = obstacleType === 'tree' ? 0.1 : obstacleType === 'rock' ? (tileType === 3 ? 0.5 : 0.1) : 0.2;

            if (Math.random() < spawnChance) {
              const obstacleX = chunkWorldX + x * this.tileSize + this.tileSize / 2;
              const obstacleY = chunkWorldY + y * this.tileSize + this.tileSize / 2;

              const obstacle = this.createObstacleEntity(obstacleType, obstacleX, obstacleY);
              if (obstacle) {
                chunk.obstacles.push(obstacle);
              }
              break; // Только одно препятствие на тайл
            }
          }
        }
      }
    }
  }

  getTerrainTypeAt(worldX: number, worldY: number): number {
    // Определяем чанк по мировым координатам
    const chunkX = Math.floor(worldX / (this.chunkSize * this.tileSize));
    const chunkY = Math.floor(worldY / (this.chunkSize * this.tileSize));

    const chunkKey = `${chunkX},${chunkY}`;
    const chunk = this.loadedChunks.get(chunkKey);

    if (!chunk) {
      return 2; // GRASS по умолчанию, если чанк не загружен
    }

    // Определяем локальные координаты в чанке
    const localX = Math.floor((worldX - chunkX * this.chunkSize * this.tileSize) / this.tileSize);
    const localY = Math.floor((worldY - chunkY * this.chunkSize * this.tileSize) / this.tileSize);

    // Проверяем границы массива
    if (localX >= 0 && localX < this.chunkSize && localY >= 0 && localY < this.chunkSize) {
      return chunk.tiles[localY][localX];
    }

    return 2; // GRASS по умолчанию, если за границами
  }

  private createItemEntity(itemType: string, x: number, y: number): void {
    const randomSprite = AssetLoader.getRandomAsset(itemType);
    const item = this.itemsGroup.create(x, y, randomSprite || "");

    switch (itemType) {
      case "mushroom": item.setScale(0.5); break;
      case "wood": item.setScale(0.3); break;
      case "star": item.setScale(0.1); break;
      case "mountain": item.setScale(1); break;

      default: item.setScale(0.5);
    }

    item.setData('itemType', itemType);
    item.setData('collected', false);
    item.setInteractive();
    item.setDepth(y + 500);
    item.body.setSize(20, 20);
  }

  private createObstacleEntity(obstacleType: string, x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
    try {
      const config = this.terrainGenerator.getObstacleConfig(obstacleType);

      // Получаем случайный спрайт через AssetLoader
      const randomSprite = AssetLoader.getRandomAsset(obstacleType);

      if (!randomSprite) {
        console.warn(`No sprite available for obstacle type: ${obstacleType}`);
        return null;
      }

      // Проверяем что текстура существует
      if (!this.scene.textures.exists(randomSprite)) {
        console.warn(`Texture not loaded: ${randomSprite}`);
        return null;
      }

      const obstacle = this.obstaclesGroup.create(x, y, randomSprite);

      if (config.isSolid) {
        obstacle.setImmovable(true);
      }

      obstacle.setData('type', obstacleType);
      obstacle.setData('isSolid', config.isSolid);
      obstacle.setData('canInteract', config.canInteract);
      obstacle.setData('spriteName', randomSprite); // Сохраняем имя спрайта

      // Настраиваем размер коллайдера
      this.setupObstaclePhysics(obstacle, obstacleType);

      return obstacle;
    } catch (error) {
      console.warn(`Could not create obstacle ${obstacleType}:`, error);
      return null;
    }
  }

  private setupObstaclePhysics(obstacle: Phaser.Physics.Arcade.Sprite, obstacleType: string): void {
    switch (obstacleType) {
      case 'tree':
        obstacle.body?.setSize(40, 40);
        obstacle.setScale(0.5);
        break;
      case 'rock':
        obstacle.body?.setSize(30, 30);
        obstacle.setScale(0.5);
        break;
      case 'bush':
        obstacle.body?.setSize(25, 25);
        obstacle.setScale(0.2);
        break;
      case 'mountain':
        obstacle.body?.setSize(50, 50);
        obstacle.setScale(1);
        break;
      default:
        obstacle.body?.setSize(30, 30);
        obstacle.setScale(0.1);
    }
  }

  unloadChunk(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;
    const chunk = this.loadedChunks.get(chunkKey);

    if (chunk) {
      // Удаляем графику
      chunk.graphics.destroy();

      // Удаляем препятствия
      chunk.obstacles.forEach(obstacle => {
        obstacle.destroy();
      });

      this.loadedChunks.delete(chunkKey);
    }
  }

  getLoadedChunks(): Map<string, Chunk> {
    return this.loadedChunks;
  }

  getItemManager(): ItemManager {
    return this.itemManager;
  }
}