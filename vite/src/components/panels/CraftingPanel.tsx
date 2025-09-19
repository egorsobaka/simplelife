// src/components/panels/CraftingPanel.tsx
import React from 'react';
import { BasePanel } from './BasePanel';

interface CraftingPanelProps {
  onClose: () => void;
}

export const CraftingPanel: React.FC<CraftingPanelProps> = ({ onClose }) => (
  <BasePanel title="Крафтинг" onClose={onClose}>
    <div style={{ padding: '10px 0', textAlign: 'center' }}>
      <p style={{ opacity: 0.7 }}>Система крафтинга в разработке...</p>
    </div>
  </BasePanel>
);