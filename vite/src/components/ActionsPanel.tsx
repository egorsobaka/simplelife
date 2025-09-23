// src/components/ButtonPanel.tsx
import React from 'react';

export interface ButtonConfig {
  type: string;
  icon: string;
  label: string;
  notification?: number;
}

interface ButtonPanelProps {
  onButtonClick: (action: ButtonConfig) => void;
  buttons?: ButtonConfig[];
  position?: 'bottom' | 'top' | 'left' | 'right';
}

export const ActionsPanel: React.FC<ButtonPanelProps> = ({
  onButtonClick,
  buttons = defaultButtons,
  position = 'bottom'
}) => {
  const getPanelStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      display: 'flex',
      gap: '10px',
      background: 'rgba(0,0,0,0.7)',
      padding: '10px 15px',
      borderRadius: '25px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      zIndex: 1000
    };

    switch (position) {
      case 'top':
        return { ...baseStyle, top: '20px', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...baseStyle, left: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'column' };
      case 'right':
        return { ...baseStyle, right: '20px', bottom: '100px', transform: 'translateY(-50%)', flexDirection: 'column' };
      default:
        return { ...baseStyle, bottom: '130px', left: '20%', transform: 'translateX(-50%)' };
    }
  };

  return (
    <div style={getPanelStyle()}>
      {buttons.map(button => (
        <ButtonItem
          key={button.type}
          button={button}
          isActive={false}
          onClick={() => onButtonClick(button)}
        />
      ))}
    </div>
  );
};

interface ButtonItemProps {
  button: ButtonConfig;
  isActive: boolean;
  onClick: () => void;
}

const ButtonItem: React.FC<ButtonItemProps> = ({ button, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        border: 'none',
        background: isActive 
          ? 'var(--tg-theme-button-color, #2481cc)' 
          : 'rgba(255,255,255,0.1)',
        color: 'white',
        fontSize: '20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      title={button.label}
    >
      {button.icon}
      
      {button.notification && button.notification > 0 && (
        <span style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          background: '#ff3b30',
          color: 'white',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}>
          {button.notification > 9 ? '9+' : button.notification}
        </span>
      )}
      
      {isActive && (
        <span style={{
          position: 'absolute',
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: 'white',
          whiteSpace: 'nowrap'
        }}>
          {button.label}
        </span>
      )}
    </button>
  );
};

export const defaultButtons: ButtonConfig[] = [
  { type: 'wood', icon: '⚒️', label: 'Топор' },
];