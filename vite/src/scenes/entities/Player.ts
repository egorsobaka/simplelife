// src/scenes/entities/Player.ts
export const PLAYER_WIDTH = 96;
export const PLAYER_HEIGHT = 128;

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private isColliding: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setScale(32 / PLAYER_WIDTH, 32 / PLAYER_HEIGHT);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setCollideWorldBounds(false);
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
      //  this.sprite.rotation = Math.atan2(y, x);
    }
  }

  public setColliding(state: boolean): void {
    this.isColliding = state;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  public playAnim(velocityX: number, velocityY: number) {
    let anim: string | null = null;
    if (Math.abs(velocityX) > Math.abs(velocityY)) anim = velocityX > 0 ? "walk_right" : "walk_left";
    else if (Math.abs(velocityY) > 0) anim = velocityY > 0 ? "walk_down" : "walk_up";

    if (anim) {
      this.sprite.play(anim, true);
    }
    else {
      this.sprite.anims.stop();
      anim = null;
    } 
  }

  public createAnimations(scene: Phaser.Scene,) {
    scene.anims.create({ key: "walk_down", frames: scene.anims.generateFrameNumbers("player", { start: 16, end: 17 }), frameRate: 5, repeat: -1 });
    scene.anims.create({ key: "walk_up", frames: scene.anims.generateFrameNumbers("player", { start: 5, end: 6 }), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: "walk_left", frames: scene.anims.generateFrameNumbers("player", { start: 10, end: 10 }), frameRate: 10, repeat: -1 });
    scene.anims.create({ key: "walk_right", frames: scene.anims.generateFrameNumbers("player", { start: 24, end: 26 }), frameRate: 10, repeat: -1 });
  }
}