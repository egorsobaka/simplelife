// src/scenes/chunks/TerrainGenerator.ts
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
    [this.terrainTypes.MOUNTAIN]: 0x888888,
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
        return terrainType === this.terrainTypes.GRASS;
      case 'wood':
        return terrainType === this.terrainTypes.FOREST;
      case 'stone':
        return terrainType === this.terrainTypes.MOUNTAIN;
      default:
        return false;
    }
  }
}