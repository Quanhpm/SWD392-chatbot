import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'info' | 'error' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', ...props }) => {
  const getClassName = () => {
    switch (variant) {
      case 'success':
        return 'badge badge--success';
      case 'warning':
        return 'badge badge--warning';
      case 'info':
        return 'badge badge--info';
      case 'error':
        return 'badge badge--error';
      default:
        return 'badge badge--default';
    }
  };

  return (
    <span className={`${getClassName()} ${className}`} {...props}>
      {children}
    </span>
  );
};
