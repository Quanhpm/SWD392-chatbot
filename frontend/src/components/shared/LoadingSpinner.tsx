import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = 'Loading...', size = 'md' }) => {
  const getSpinnerSize = () => {
    if (size === 'sm') return 'w-4 h-4 border-2';
    if (size === 'lg') return 'w-10 h-10 border-4';
    return 'w-8 h-8 border-3';
  };

  return (
    <div className="flex-center flex-col gap-md p-lg">
      <div
        className={`${getSpinnerSize()} border-solid rounded-full animate-spin`}
        style={{
          borderTopColor: 'var(--color-primary)',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
        }}
      />
      {label && (
        <span style={{ font: 'var(--text-label-md)', color: 'var(--color-on-surface-variant)' }}>
          {label}
        </span>
      )}
      <style>{`
        .w-4 { width: 1rem; } .h-4 { height: 1rem; } .border-2 { border-width: 2px; }
        .w-8 { width: 2rem; } .h-8 { height: 2rem; } .border-3 { border-width: 3px; }
        .w-10 { width: 2.5rem; } .h-10 { height: 2.5rem; } .border-4 { border-width: 4px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
