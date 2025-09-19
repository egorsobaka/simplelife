// src/scenes/entities/items/ItemManager.ts
import { Item } from './Item';
import { StarItem } from './items/StarItem';
import { WoodItem } from './items/WoodItem';
import { StoneItem } from './items/StoneItem';

export class ItemManager {
  private items: Map<string, Item> = new Map();
  private playerInventory: Map<string, Item> = new Map();

  constructor() {
    this.registerItems();
  }

  private registerItems(): void {
    this.registerItem(new StarItem());
    this.registerItem(new WoodItem());
    this.registerItem(new StoneItem());
  }

  private registerItem(item: Item): void {
    this.items.set(item.id, item);
  }

  public createItem(id: string): Item | null {
    const template = this.items.get(id);
    if (!template) return null;

    // Создаем новый экземпляр предмета
    switch (id) {
      case 'star': return new StarItem();
      case 'wood': return new WoodItem();
      case 'stone': return new StoneItem();
      default: return null;
    }
  }

  public addToInventory(item: Item): boolean {
    const existingItem = this.playerInventory.get(item.id);
    
    if (existingItem) {
      const remaining = existingItem.addQuantity(item.quantity);
      if (remaining > 0) {
        // Не поместилось в стек
        return false;
      }
    } else {
      this.playerInventory.set(item.id, item);
    }

    return true;
  }

  public getInventory(): Map<string, Item> {
    return this.playerInventory;
  }

  public getInventoryCount(): number {
    let count = 0;
    this.playerInventory.forEach(item => {
      count += item.quantity;
    });
    return count;
  }

  public removeFromInventory(itemId: string, quantity: number = 1): boolean {
    const item = this.playerInventory.get(itemId);
    if (!item) return false;

    if (item.quantity <= quantity) {
      this.playerInventory.delete(itemId);
    } else {
      item.quantity -= quantity;
    }

    return true;
  }
}