// src/hooks/useGameEvents.ts
import { GameEventBus } from '../utils/GameEventBus';

export const useGameEvents = () => {
  const eventBus = GameEventBus.getInstance();

  const emitEvent = (event: string, data?: any) => {
    eventBus.emit(event, data);
  };

  const onEvent = (event: string, callback: (data: any) => void) => {
    eventBus.on(event, callback);
    
    return () => {
      eventBus.off(event, callback);
    };
  };

  return { emitEvent, onEvent };
};