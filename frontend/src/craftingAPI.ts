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
  inventory: Record<string, number>,
  ownedItems: string[] = []
): Promise<CraftableItem[]> {
  const response = await fetch((import.meta.env.VITE_SOCKET_URL as string) + "api/crafting/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inventory, ownedItems })
  });
  const data: CraftableItem[] = await response.json();
  return data;
}
