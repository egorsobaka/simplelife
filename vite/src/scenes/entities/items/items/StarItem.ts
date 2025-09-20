// src/scenes/entities/items/items/StarItem.ts
import { Item } from '../Item';

export class StarItem extends Item {
  constructor() {
    super('star', 'Звезда', 'Сияющая звезда', '⭐');
  }

  onCollect(scene: Phaser.Scene): void {
    scene.events.emit('showMessage', 'Найдена звезда! +10 очков');
  }

  onUse(scene: Phaser.Scene): void {
    scene.events.emit('showMessage', 'Использована звезда! +10 очков');
  }
}