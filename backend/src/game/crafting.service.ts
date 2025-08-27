import { Injectable } from '@nestjs/common';
import { itemsJson } from '../items/items.js';
import { rulesJson } from '../items/crafting-rules.js';

export type ItemType = 'resource' | 'material' | 'item';

export interface CraftItem {
  name: string;
  title: string;
  type: ItemType;
}

export interface Ingredient {
  name: string;
  title: string;
  amount: number;
}

export interface Requirement {
  name: string;
  title: string;
}

export interface CraftRule {
  result: string;
  resultTitle: string;
  ingredients: Ingredient[];
  requires?: Requirement[];
}

export interface CraftableItem extends CraftItem {
  craftable: boolean;
  missingIngredients: Ingredient[];
  missingRequirements: Requirement[];
}

@Injectable()
export class CraftingService {
  private items: CraftItem[] = itemsJson;
  private rules: CraftRule[] = rulesJson;

  generateCrafting(
    inventory: Record<string, number>,
    ownedItems: string[] = [],
  ): CraftableItem[] {
    const craftableSet = new Set<string>();
    let updated = true;

    while (updated) {
      updated = false;
      for (const rule of this.rules) {
        if (craftableSet.has(rule.result)) continue;

        const hasIngredients = rule.ingredients.every(
          (ing) =>
            (inventory[ing.name] ?? 0) >= ing.amount || craftableSet.has(ing.name),
        );

        const hasRequirements = (rule.requires ?? []).every((req) =>
          ownedItems.includes(req.name),
        );

        if (hasIngredients && hasRequirements) {
          craftableSet.add(rule.result);
          updated = true;
        }
      }
    }

    return this.items.map((item) => {
      const rule = this.rules.find((r) => r.result === item.name);
      if (!rule) {
        return { ...item, craftable: false, missingIngredients: [], missingRequirements: [] };
      }

      const missingIngredients: Ingredient[] = [];
      const missingRequirements: Requirement[] = [];

      for (const ing of rule.ingredients) {
        const count = inventory[ing.name] ?? 0;
        if (count < ing.amount && !craftableSet.has(ing.name)) {
          missingIngredients.push({ ...ing, amount: ing.amount - count });
        }
      }

      for (const req of rule.requires ?? []) {
        if (!ownedItems.includes(req.name)) {
          missingRequirements.push(req);
        }
      }

      return {
        ...item,
        craftable: craftableSet.has(item.name),
        missingIngredients,
        missingRequirements,
      };
    });
  }

  /**
   * Выполнить крафт предмета
   */
  craftItem(
    itemName: string,
    inventory: Record<string, number>,
    ownedItems: string[] = [],
    emitFn?: (event: string, payload: any) => void,
  ): { success: boolean; message: string; inventory: Record<string, number> } {
    const rule = this.rules.find((r) => r.result === itemName);
    if (!rule) {
      return { success: false, message: 'Нет такого рецепта', inventory };
    }

    // Проверяем требования
    for (const req of rule.requires ?? []) {
      if (!ownedItems.includes(req.name)) {
        return { success: false, message: `Нужен предмет: ${req.title}`, inventory };
      }
    }

    // Проверяем ингредиенты
    for (const ing of rule.ingredients) {
      const count = inventory[ing.name] ?? 0;
      if (count < ing.amount) {
        return { success: false, message: `Недостаточно ${ing.title}`, inventory };
      }
    }

    // Списываем ингредиенты
    for (const ing of rule.ingredients) {
      inventory[ing.name] = (inventory[ing.name] ?? 0) - ing.amount;
      if (inventory[ing.name] <= 0) delete inventory[ing.name];
    }

    // Добавляем результат
    inventory[itemName] = (inventory[itemName] ?? 0) + 1;

    // Шлём событие (например, WebSocket)
    if (emitFn) {
      emitFn('crafted', {
        item: { name: rule.result, title: rule.resultTitle },
        inventory,
      });
    }

    return { success: true, message: `Скрафчен ${rule.resultTitle}`, inventory };
  }
}
