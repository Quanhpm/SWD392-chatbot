import React from 'react';
import { Icon } from './Icon.js';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state fade-in">
      <div className="empty-state__icon">
        <Icon name={icon} style={{ fontSize: '28px' }} />
      </div>
      <h3 style={{ font: 'var(--text-headline-md)', fontWeight: 600 }}>{title}</h3>
      <p style={{ font: 'var(--text-body-md)', color: 'var(--color-on-surface-variant)', maxWidth: '320px' }}>{description}</p>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};
