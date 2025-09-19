// src/components/UIOverlay.tsx
import React, { useState, useEffect } from 'react';
import { useGameEvents } from '../hooks/useGameEvents';
import { useTelegram } from '../hooks/useTelegram';

export const UIOverlay: React.FC = () => {
  const [score, setScore] = useState(0);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const { onEvent, emitEvent } = useGameEvents();
  const { user, showAlert, closeApp } = useTelegram();
  

  useEffect(() => {
    const unsubscribe1 = onEvent('starCollected', (data: { score: number }) => {
      setScore(data.score);
      console.log(data.score)
    });

    const unsubscribe2 = onEvent('gameStarted', (data: { player: any }) => {
      console.log("gameStarted", data.player);

    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [onEvent]);

  const handleAddScore = () => {
    emitEvent('addScore', { points: 50 });
    showAlert('+50 очков!');
  };

  const handleShareScore = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.sendData(
        JSON.stringify({ 
          action: 'share_score', 
          score,
          user: user?.first_name 
        })
      );
    }
  };

  return (
    <div>
      <h3>👤 {user?.first_name}</h3>
      <div>⭐ Score: {score}</div>
      
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={handleAddScore}
          style={{
            background: '#4CAF50',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            color: 'white',
            marginRight: '5px',
            cursor: 'pointer'
          }}
        >
          +50 очков
        </button>
        
        <button 
          onClick={handleShareScore}
          style={{
            background: '#2196F3',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Поделиться
        </button>
      </div>

      <button 
        onClick={closeApp}
        style={{
          background: '#f44336',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          color: 'white',
          marginTop: '10px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Выход
      </button>
    </div>
  );
};