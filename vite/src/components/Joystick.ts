// src/components/Joystick.ts
export class Joystick {
  public container: Phaser.GameObjects.Container;
  public base: Phaser.GameObjects.Arc;
  public thumb: Phaser.GameObjects.Arc;
  public thumb1: Phaser.GameObjects.Arc;

  public data: { force: number; angle: number; active: boolean };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.data = { force: 0, angle: 0, active: false };

    this.base = scene.add.circle(x, y, 60, 0x000000, 0.5)
    this.thumb = scene.add.circle(x, y, 30, 0xffffff, 0.8).setDepth(1100);
    this.thumb1 = scene.add.circle(x, y, 10, 0xffdd00, 0.8).setDepth(1200).setScrollFactor(0).setInteractive();

    this.container = scene.add.container(0, 0, [this.base, this.thumb]);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    this.setupInteractions(scene);
  }

  private setupInteractions(scene: Phaser.Scene): void {
    this.thumb.setInteractive({ draggable: true });

    this.thumb.on('drag', (pointer: Phaser.Input.Pointer) => {
      console.log("drag")
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
      console.log("dragstart");
      this.data.active = true;
    });

    scene.input.on("pointerup", () => {
      console.log("pointerup");
      this.thumb.setData("dragging", false);
      this.thumb.x = this.base.x;
      this.thumb.y = this.base.y;
    });

     scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.thumb.getData("dragging")) return;
      const dx = pointer.x - this.base.x;
      const dy = pointer.y - this.base.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 20;
      const angle = Math.atan2(dy, dx);
      const limitedDist = Math.min(dist, maxDist);

      this.thumb.x = this.base.x + Math.cos(angle) * limitedDist;
      this.thumb.y = this.base.y + Math.sin(angle) * limitedDist;

      // mobileDir.x = (limitedDist / maxDist) * Math.cos(angle);
      // mobileDir.y = (limitedDist / maxDist) * Math.sin(angle);
    });

  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.base.setPosition(x, y);
    this.thumb.setPosition(x, y);
  }
}