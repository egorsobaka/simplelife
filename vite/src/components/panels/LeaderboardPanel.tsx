// src/components/panels/LeaderboardPanel.tsx
import React from 'react';
import { BasePanel } from './BasePanel';

interface LeaderboardPanelProps {
  onClose: () => void;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => (
  <BasePanel title="Лидерборд" onClose={onClose}>
    <div style={{ padding: '10px 0', textAlign: 'center' }}>
      <p style={{ opacity: 0.7 }}>Таблица лидеров скоро появится...</p>
    </div>
  </BasePanel>
);