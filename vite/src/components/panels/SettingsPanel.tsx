// src/components/panels/SettingsPanel.tsx
import React from 'react';
import { BasePanel } from './BasePanel';
import { UIOverlay } from '../UIOverlay';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => (
  <BasePanel title="Настройки" onClose={onClose} width="90%" height="80%">
    <UIOverlay />
  </BasePanel>
);