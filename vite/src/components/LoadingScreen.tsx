// src/components/LoadingScreen.tsx
import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Загрузка...", 
  progress = 0,
  showProgress = false 
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        {/* Логотип или иконка */}
        <div className="loading-logo">
          <div className="logo-spinner">
            <div className="logo-inner">🎮</div>
          </div>
        </div>

        {/* Сообщение загрузки */}
        <h2 className="loading-title">Telegram Game</h2>
        <p className="loading-message">{message}</p>

        {/* Прогресс бар */}
        {showProgress && (
          <div className="progress-container">
            <div 
              className="progress-bar" 
              style={{ width: `${progress}%` }}
            />
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}

        {/* Спиннер */}
        {!showProgress && (
          <div className="spinner">
            <div className="spinner-inner"></div>
          </div>
        )}

        {/* Telegram badge */}
        <div className="telegram-badge">
          <span className="telegram-icon">📱</span>
          <span>Powered by Telegram</span>
        </div>
      </div>
    </div>
  );
};

// Вариант с анимацией загрузки ресурсов
interface ResourceLoadingProps {
  loaded: number;
  total: number;
  currentFile?: string;
}

export const ResourceLoadingScreen: React.FC<ResourceLoadingProps> = ({ 
  loaded, 
  total, 
  currentFile 
}) => {
  const progress = total > 0 ? (loaded / total) * 100 : 0;

  return (
    <LoadingScreen
      message={currentFile ? `Загрузка: ${currentFile}` : "Загрузка ресурсов..."}
      progress={progress}
      showProgress={true}
    />
  );
};