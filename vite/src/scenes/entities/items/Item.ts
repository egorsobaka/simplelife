// src/scenes/entities/items/Item.ts
export abstract class Item {
  public id: string;
  public name: string;
  public description: string;
  public icon: string;
  public quantity: number;
  public maxStack: number;

  constructor(id: string, name: string, description: string, icon: string, maxStack: number = 99) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
    this.quantity = 1;
    this.maxStack = maxStack;
  }

  abstract onCollect(scene: Phaser.Scene): void;
  abstract onUse(scene: Phaser.Scene): void;

  public addQuantity(amount: number): number {
    const remaining = Math.max(0, this.quantity + amount - this.maxStack);
    this.quantity = Math.min(this.quantity + amount, this.maxStack);
    return remaining;
  }
}