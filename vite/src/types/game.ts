// src/types/game.ts
export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
}

export interface ObstacleConfig {
  type: string;
  sprite: string;
  isSolid: boolean;
  canInteract?: boolean;
}