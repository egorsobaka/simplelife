// src/components/panels/BasePanel.tsx
import React from 'react';

interface BasePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  height?: string;
}

export const BasePanel: React.FC<BasePanelProps> = ({
  title,
  onClose,
  children,
  width = '80%',
  height = '70%'
}) => (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: width,
    maxWidth: '400px',
    maxHeight: height,
    background: 'rgba(0,0,0,0.95)',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '15px',
    padding: '20px',
    color: 'white',
    zIndex: 1002,
    overflow: 'auto',
    backdropFilter: 'blur(10px)'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      paddingBottom: '10px'
    }}>
      <h3 style={{ margin: 0, color: 'var(--tg-theme-text-color, white)' }}>{title}</h3>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          padding: '5px 10px',
          borderRadius: '5px',
          transition: 'background 0.3s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      >
        ✕
      </button>
    </div>
    {children}
  </div>
);