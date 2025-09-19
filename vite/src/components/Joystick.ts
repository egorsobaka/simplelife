// src/components/Joystick.ts
export class Joystick {
  public container: Phaser.GameObjects.Container;
  public base: Phaser.GameObjects.Arc;
  public thumb: Phaser.GameObjects.Arc;
  public data: { force: number; angle: number; active: boolean };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.data = { force: 0, angle: 0, active: false };
    
    this.base = scene.add.circle(x, y, 40, 0x000000, 0.5);
    this.thumb = scene.add.circle(x, y, 20, 0xffffff, 0.8);

    this.container = scene.add.container(0, 0, [this.base, this.thumb]);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.setupInteractions();
  }

  private setupInteractions(): void {
    this.thumb.setInteractive({ draggable: true });

    this.thumb.on('drag', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - this.container.x;
      const localY = pointer.y - this.container.y;
      
      const distance = Phaser.Math.Distance.Between(this.base.x, this.base.y, localX, localY);
      const angle = Phaser.Math.Angle.Between(this.base.x, this.base.y, localX, localY);
      
      const maxDistance = 40 - 20;
      const clampedDistance = Math.min(distance, maxDistance);
      
      const thumbX = this.base.x + Math.cos(angle) * clampedDistance;
      const thumbY = this.base.y + Math.sin(angle) * clampedDistance;
      
      this.thumb.x = thumbX;
      this.thumb.y = thumbY;
      
      this.data = {
        force: clampedDistance / maxDistance,
        angle: angle,
        active: true
      };
    });

    this.thumb.on('dragend', () => {
      this.thumb.x = this.base.x;
      this.thumb.y = this.base.y;
      this.data.active = false;
    });

    this.thumb.on('dragstart', () => {
      this.data.active = true;
    });
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.base.setPosition(x, y);
    this.thumb.setPosition(x, y);
  }
}