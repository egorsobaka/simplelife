// src/scenes/entities/Player.ts
export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private isColliding: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setScale(0.8);
    this.sprite.setDepth(10);
    
    // Устанавливаем размер hitbox для лучшего взаимодействия
    this.sprite?.body?.setSize(20, 30);
  }

  public setVelocity(x: number, y: number): void {
    if (this.isColliding) {
      // Уменьшаем скорость при столкновении
      this.sprite.setVelocity(x * 0.3, y * 0.3);
    } else {
      this.sprite.setVelocity(x, y);
    }

    if (x !== 0 || y !== 0) {
      this.sprite.rotation = Math.atan2(y, x);
    }
  }

  public setColliding(state: boolean): void {
    this.isColliding = state;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
}