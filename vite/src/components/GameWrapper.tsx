// src/components/GameWrapper.tsx
import React, { useEffect, useState } from 'react';
import { PhaserGame } from './PhaserGame';
import { LoadingScreen } from './LoadingScreen';
import { useTelegram } from '../hooks/useTelegram';
import { GameEventBus } from '@/utils/GameEventBus';
import { ButtonPanel, defaultButtons } from './ButtonPanel';
import { InventoryPanel } from './panels/InventoryPanel';
import { LeaderboardPanel } from './panels/LeaderboardPanel';
import { CraftingPanel } from './panels/CraftingPanel';
import { ChatPanel } from './panels/ChatPanel';
import { SettingsPanel } from './panels/SettingsPanel';

export const GameWrapper: React.FC = () => {
  const { isInitialized, user } = useTelegram();
  const [activePanel, setActivePanel] = useState<string | null>(null);

  useEffect(() => {
    // Настраиваем слушатели для работы с стором
    GameEventBus.setupInventoryListeners();
  }, []);

  if (!isInitialized) {
    return <LoadingScreen message="Загрузка Telegram..." />;
  }

  const handleButtonClick = (buttonType: string) => {
    setActivePanel(activePanel === buttonType ? null : buttonType);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <PhaserGame />

      {/* Кнопочная панель */}
      <ButtonPanel 
        onButtonClick={handleButtonClick}
        activePanel={activePanel}
        buttons={defaultButtons}
        position="bottom"
      />
      
      {/* Панели интерфейса */}
      {activePanel === 'inventory' && (
        <InventoryPanel onClose={handleClosePanel} />
      )}
      
      {activePanel === 'leaderboard' && (
        <LeaderboardPanel onClose={handleClosePanel} />
      )}
      
      {activePanel === 'crafting' && (
        <CraftingPanel onClose={handleClosePanel} />
      )}
      
      {activePanel === 'chat' && (
        <ChatPanel onClose={handleClosePanel} />
      )}
      
      {activePanel === 'settings' && (
        <SettingsPanel onClose={handleClosePanel} />
      )}

      {/* Welcome message */}
      {user && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '20px',
          borderRadius: '10px',
          color: 'white',
          textAlign: 'center',
          zIndex: 1001,
          animation: 'fadeOut 3s forwards'
        }}>
          <h2>Добро пожаловать, {user.first_name}!</h2>
          <p>Исследуй мир и собирай ресурсы!</p>
        </div>
      )}
    </div>
  );
};