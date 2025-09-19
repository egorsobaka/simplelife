// src/scenes/chunks/ChunkManager.ts
import { TerrainGenerator } from './TerrainGenerator';
import { ItemManager } from '../entities/items/ItemManager';

interface Chunk {
  x: number;
  y: number;
  tiles: number[][];
  graphics: Phaser.GameObjects.Graphics;
}

export class ChunkManager {
  private loadedChunks: Map<string, Chunk> = new Map();
  private terrainGenerator: TerrainGenerator;
  private itemManager: ItemManager;
  private scene: Phaser.Scene;
  private chunkSize: number;
  private tileSize: number;
  private itemsGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, itemsGroup: Phaser.Physics.Arcade.Group, chunkSize: number = 40, tileSize: number = 32) {
    this.scene = scene;
    this.itemsGroup = itemsGroup;
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
        
        graphics.lineStyle(1, 0x000000, 0.2);
        graphics.strokeRect(tileX, tileY, this.tileSize, this.tileSize);
      }
    }

    const chunk: Chunk = {
      x: chunkX,
      y: chunkY,
      tiles,
      graphics
    };

    this.loadedChunks.set(chunkKey, chunk);
    this.spawnItemsInChunk(chunkX, chunkY, tiles);
  }

  private spawnItemsInChunk(chunkX: number, chunkY: number, tiles: number[][]): void {
    const chunkWorldX = chunkX * this.chunkSize * this.tileSize;
    const chunkWorldY = chunkY * this.chunkSize * this.tileSize;

    // Спавним предметы в зависимости от типа местности
    for (let y = 0; y < this.chunkSize; y++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const tileType = tiles[y][x];
        
        let itemType: string | null = null;
        let spawnChance = 0;

        if (this.terrainGenerator.canSpawnItem(tileType, 'star')) {
          itemType = 'star';
          spawnChance = 0.1;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'wood')) {
          itemType = 'wood';
          spawnChance = 0.2;
        } else if (this.terrainGenerator.canSpawnItem(tileType, 'stone')) {
          itemType = 'stone';
          spawnChance = 0.15;
        }

        if (itemType && Math.random() < spawnChance) {
          const itemX = chunkWorldX + x * this.tileSize + this.tileSize / 2;
          const itemY = chunkWorldY + y * this.tileSize + this.tileSize / 2;
          
          this.createItemEntity(itemType, itemX, itemY);
        }
      }
    }
  }

  private createItemEntity(itemType: string, x: number, y: number): void {
    // Используем общую группу предметов
    const item = this.itemsGroup.create(x, y, 'items', this.getItemFrame(itemType));
    item.setScale(0.7);
    item.setData('itemType', itemType);
    item.setData('collected', false);
    
    // Добавляем физическое тело
    item.setInteractive();
    item.body.setSize(20, 20); // Уменьшаем hitbox для лучшего взаимодействия
  }

  private getItemFrame(itemType: string): number {
    const frames: { [key: string]: number } = {
      'star': 0,
      'wood': 1,
      'stone': 2
    };
    return frames[itemType] || 0;
  }

  unloadChunk(chunkX: number, chunkY: number): void {
    const chunkKey = `${chunkX},${chunkY}`;
    const chunk = this.loadedChunks.get(chunkKey);
    
    if (chunk) {
      chunk.graphics.destroy();
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