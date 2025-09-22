// src/utils/GameEventBus.ts
import { useGameStore } from '@/store/gameStore';

export class GameEventBus {
  private static instance: GameEventBus;
  private eventEmitter: Phaser.Events.EventEmitter;

  private constructor() {
    this.eventEmitter = new Phaser.Events.EventEmitter();
  }

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  public on(event: string, callback: Function, context?: any): void {
    this.eventEmitter.on(event, callback, context);
  }

  public off(event: string, callback?: Function, context?: any): void {
    this.eventEmitter.off(event, callback, context);
  }

  public emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // Специальные методы для работы с инвентарем
  public static setupInventoryListeners(): void {
    const instance = GameEventBus.getInstance();
    const { addToInventory, updateScore } = useGameStore.getState();

    instance.on('itemCollected', (data: { itemType: string }) => {
      const items = {
        star: { id: 'star', name: 'Звезда', icon: '⭐' },
        wood: { id: 'wood', name: 'Дерево', icon: '🪵' },
        stone: { id: 'stone', name: 'Камень', icon: '🪨' }
      };

      const item = items[data.itemType as keyof typeof items];
      if (item) {
        addToInventory(item);

        if (data.itemType === 'star') {
          updateScore(10);
        }
      }
    });
  }

  public static setupAvailableActionListeners(): void {

    const { addAction, clearActions } = useGameStore.getState();
    const instance = GameEventBus.getInstance();
    instance.on('enableAction', (data: { action: string }) => {
      const actions = {
        star: { id: 'star', label: 'Звезда', icon: '⭐', type: 'star' },
        tree: { id: 'wood', label: 'Дерево', icon: '🪵', type: 'wood' },
        stone: { id: 'stone', label: 'Камень', icon: '🪨', type: 'stone' }
      };

      const item = actions[data.action as keyof typeof actions];
      if (item) {
        addAction(item);
      }
    });

    instance.on('disableActions', () => {
      clearActions();
    });
  }
}