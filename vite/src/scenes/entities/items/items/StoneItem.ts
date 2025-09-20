// src/scenes/entities/items/items/StoneItem.ts
import { Item } from '../Item';

export class StoneItem extends Item {
  constructor() {
    super('stone', 'Камень', 'Камень для строительства', '🪨', 50);
  }

  onCollect(scene: Phaser.Scene): void {
    scene.events.emit('showMessage', 'Найден камень');
  }

  onUse(scene: Phaser.Scene): void {
     scene.events.emit('showMessage', 'Использован камень');
  }
}