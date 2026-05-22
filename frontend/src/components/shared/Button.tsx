import React from 'react';
import { Icon } from './Icon.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'filled',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const getClassName = () => {
    const base = 'btn';
    if (variant === 'filled') {
      return `${base} btn--filled`;
    }
    if (variant === 'outlined') {
      return `${base} btn--outlined`;
    }
    return `${base} btn--text`;
  };

  return (
    <button className={`${getClassName()} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="btn__spinner" aria-hidden="true">⏳</span>
      ) : (
        <>
          {icon && iconPosition === 'left' && <Icon name={icon} />}
          {children}
          {icon && iconPosition === 'right' && <Icon name={icon} />}
        </>
      )}
    </button>
  );
};
