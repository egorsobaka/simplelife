import type { InventoryItem } from "./gameScene";

// craftingAPI.ts
export interface CraftableItem {
  name: string;
  title: string;
  type: "resource" | "material" | "item";
  craftable: boolean;
  missingIngredients: { name: string; title: string; amount: number }[];
  missingRequirements: { name: string; title: string }[];
}

export async function fetchCraftableItems(
  inventory: Record<string, InventoryItem>,
  ownedItems: string[] = []
): Promise<CraftableItem[]> {
  const tg = (window as any).Telegram?.WebApp;

  const response = await fetch((import.meta.env.VITE_SOCKET_URL as string) + "api/crafting/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inventory, ownedItems, initData: tg.initData, })
  });
  const data: CraftableItem[] = await response.json();
  return data;
}
