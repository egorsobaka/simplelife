// src/scenes/entities/Player.ts
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;

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
}