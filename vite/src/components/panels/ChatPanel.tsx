// src/components/panels/ChatPanel.tsx
import React from 'react';
import { BasePanel } from './BasePanel';

interface ChatPanelProps {
  onClose: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose }) => (
  <BasePanel title="Чат" onClose={onClose}>
    <div style={{ padding: '10px 0', textAlign: 'center' }}>
      <p style={{ opacity: 0.7 }}>Чат с игроками скоро будет доступен...</p>
    </div>
  </BasePanel>
);