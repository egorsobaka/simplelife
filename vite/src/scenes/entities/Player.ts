// src/scenes/entities/Player.ts
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public inventory: Map<string, any> = new Map();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setScale(0.8);
    this.sprite.setDepth(10);
    
    // Устанавливаем размер hitbox для лучшего взаимодействия
    this.sprite?.body?.setSize(20, 30);
  }

  public setVelocity(x: number, y: number): void {
    this.sprite.setVelocity(x, y);

    if (x !== 0 || y !== 0) {
      this.sprite.rotation = Math.atan2(y, x);
    }
  }

  public addToInventory(item: any): void {
    console.log('Adding to inventory:', item); // Отладочная информация
    
    const existing = this.inventory.get(item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.inventory.set(item.id, { ...item });
    }

    // Отправляем событие об обновлении инвентаря
    this.sprite.scene.events.emit('inventoryUpdated', this.inventory);
  }

  public getInventory(): Map<string, any> {
    return this.inventory;
  }
}