// src/scenes/entities/items/items/WoodItem.ts
import { Item } from '../Item';

export class WoodItem extends Item {
  constructor() {
    super('wood', 'Дерево', 'Древесина для крафта', '🪵', 50);
  }

  onCollect(scene: Phaser.Scene): void {
    scene.events.emit('showMessage', 'Собрано дерево');
  }

  onUse(scene: Phaser.Scene): void {
    // Можно использовать для крафта
  }
}