// src/store/gameStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
}

interface GameState {
  // Инвентарь
  inventory: Map<string, InventoryItem>;
  score: number;
  
  // Действия
  addToInventory: (item: Omit<InventoryItem, 'quantity'>) => void;
  removeFromInventory: (itemId: string, quantity?: number) => void;
  updateScore: (points: number) => void;
  resetGame: () => void;
}

// Кастомный storage для работы с Map
const createCustomStorage = (): StateStorage => {
  return {
    getItem: (name: string): string | null => {
      try {
        return localStorage.getItem(name);
      } catch (error) {
        console.error('Error getting item from storage:', error);
        return null;
      }
    },
    setItem: (name: string, value: string): void => {
      try {
        localStorage.setItem(name, value);
      } catch (error) {
        console.error('Error setting item in storage:', error);
      }
    },
    removeItem: (name: string): void => {
      try {
        localStorage.removeItem(name);
      } catch (error) {
        console.error('Error removing item from storage:', error);
      }
    },
  };
};

// Функции для сериализации/десериализации Map
const serializeState = (state: GameState): string => {
  return JSON.stringify({
    ...state,
    inventory: Array.from(state.inventory.entries()),
  });
};

const deserializeState = (str: string): GameState => {
  const parsed = JSON.parse(str);
  return {
    ...parsed,
    inventory: new Map(parsed.inventory),
  };
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      inventory: new Map(),
      score: 0,

      addToInventory: (item) => {
        const { inventory } = get();
        const newInventory = new Map(inventory);
        const existing = newInventory.get(item.id);

        if (existing) {
          newInventory.set(item.id, {
            ...existing,
            quantity: existing.quantity + 1,
          });
        } else {
          newInventory.set(item.id, {
            ...item,
            quantity: 1,
          });
        }

        set({ inventory: newInventory });
      },

      removeFromInventory: (itemId, quantity = 1) => {
        const { inventory } = get();
        const newInventory = new Map(inventory);
        const existing = newInventory.get(itemId);

        if (existing) {
          if (existing.quantity <= quantity) {
            newInventory.delete(itemId);
          } else {
            newInventory.set(itemId, {
              ...existing,
              quantity: existing.quantity - quantity,
            });
          }

          set({ inventory: newInventory });
        }
      },

      updateScore: (points) => {
        set((state) => ({ score: state.score + points }));
      },

      resetGame: () => {
        set({ inventory: new Map(), score: 0 });
      },
    }),
    {
      name: 'game-storage',
      storage: createJSONStorage(() => createCustomStorage()),
      // Используем partialize для исключения функций из сериализации
      partialize: (state) => ({
        inventory: state.inventory,
        score: state.score,
      }),
    }
  )
);

// Альтернативный вариант - более простой, но с ручной сериализацией
export const useGameStoreSimple = create<GameState>()(
  persist(
    (set, get) => ({
      inventory: new Map(),
      score: 0,

      addToInventory: (item) => {
        const { inventory } = get();
        const newInventory = new Map(inventory);
        const existing = newInventory.get(item.id);

        if (existing) {
          newInventory.set(item.id, {
            ...existing,
            quantity: existing.quantity + 1,
          });
        } else {
          newInventory.set(item.id, {
            ...item,
            quantity: 1,
          });
        }

        set({ inventory: newInventory });
      },

      removeFromInventory: (itemId, quantity = 1) => {
        const { inventory } = get();
        const newInventory = new Map(inventory);
        const existing = newInventory.get(itemId);

        if (existing) {
          if (existing.quantity <= quantity) {
            newInventory.delete(itemId);
          } else {
            newInventory.set(itemId, {
              ...existing,
              quantity: existing.quantity - quantity,
            });
          }

          set({ inventory: newInventory });
        }
      },

      updateScore: (points) => {
        set((state) => ({ score: state.score + points }));
      },

      resetGame: () => {
        set({ inventory: new Map(), score: 0 });
      },
    }),
    {
      name: 'game-storage',
      // Более простой подход - преобразуем Map в массив при сохранении
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            state: {
              ...parsed.state,
              inventory: new Map(parsed.state.inventory),
            },
            version: parsed.version,
          };
        },
        setItem: (name, value) => {
          const stateToSave = {
            state: {
              ...value.state,
              inventory: Array.from(value.state.inventory.entries()),
            },
            version: value.version,
          };
          localStorage.setItem(name, JSON.stringify(stateToSave));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);