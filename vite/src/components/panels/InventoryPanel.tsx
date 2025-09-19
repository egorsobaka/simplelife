// src/components/panels/InventoryPanel.tsx
import React from 'react';
import { BasePanel } from './BasePanel';
import { useGameStore } from '@/store/gameStore';

interface InventoryPanelProps {
  onClose: () => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ onClose }) => {
  const inventory = useGameStore((state) => state.inventory);

  return (
    <BasePanel title="Инвентарь" onClose={onClose}>
      <div style={{ padding: '10px 0' }}>
        <h4 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Ваши предметы</h4>
        
        {Object.keys(inventory).length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.7, padding: '20px' }}>
            Инвентарь пуст
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: '10px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {Object.entries(inventory).map(([id, item]) => (
              <div key={id} style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.name}</span>
                <span style={{ 
                  fontSize: '11px', 
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  minWidth: '20px'
                }}>
                  x{item.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BasePanel>
  );
};