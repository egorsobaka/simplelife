// src/store/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
}

interface GameState {
  // Инвентарь как простой объект
  inventory: Record<string, InventoryItem>;
  score: number;
  
  // Действия
  addToInventory: (item: Omit<InventoryItem, 'quantity'>) => void;
  removeFromInventory: (itemId: string, quantity?: number) => void;
  updateScore: (points: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      inventory: {},
      score: 0,

      addToInventory: (item) => {
        const state = get();
        const existing = state.inventory[item.id];

        if (existing) {
          set({
            inventory: {
              ...state.inventory,
              [item.id]: {
                ...existing,
                quantity: existing.quantity + 1,
              },
            },
          });
        } else {
          set({
            inventory: {
              ...state.inventory,
              [item.id]: {
                ...item,
                quantity: 1,
              },
            },
          });
        }
      },

      removeFromInventory: (itemId, quantity = 1) => {
        const state = get();
        const existing = state.inventory[itemId];

        if (existing) {
          if (existing.quantity <= quantity) {
            const newInventory = { ...state.inventory };
            delete newInventory[itemId];
            set({ inventory: newInventory });
          } else {
            set({
              inventory: {
                ...state.inventory,
                [itemId]: {
                  ...existing,
                  quantity: existing.quantity - quantity,
                },
              },
            });
          }
        }
      },

      updateScore: (points) => {
        set((state) => ({ score: state.score + points }));
      },

      resetGame: () => {
        set({ inventory: {}, score: 0 });
      },
    }),
    {
      name: 'game-storage',
    }
  )
);