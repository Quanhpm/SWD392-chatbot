import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { IQuotaStatus } from '../../types/index.js';

interface QuotaIndicatorProps {
  quota: IQuotaStatus | null;
  loading?: boolean;
}

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({ quota, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="quota-indicator quota-loading">
        <span className="spinner spinner-sm" />
        <span className="quota-loading-text">Đang tải hạn mức...</span>
        <Style />
      </div>
    );
  }

  if (!quota) return null;

  const percentage = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  const isExhausted = quota.used >= quota.limit;
  const barColor =
    isExhausted || percentage > 90
      ? 'var(--quota-red)'
      : percentage > 60
        ? 'var(--quota-yellow)'
        : 'var(--quota-green)';

  return (
    <div className={`quota-indicator ${isExhausted ? 'quota-exhausted' : ''}`}>
      {isExhausted ? (
        <div className="quota-alert">
          <span className="material-symbols-outlined quota-alert-icon">error</span>
          <div className="quota-alert-body">
            <p className="quota-alert-title">Đã hết lượt hỏi</p>
            <p className="quota-alert-desc">
              Bạn đã sử dụng hết {quota.limit} câu hỏi trong tháng {quota.periodKey} của gói <strong>{quota.planName}</strong>.
            </p>
          </div>
          {quota.planName !== 'teacher' && <button
            className="quota-upgrade-btn"
            onClick={() => navigate('/pricing')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>rocket_launch</span>
            Nâng cấp gói
          </button>}
        </div>
      ) : (
        <div className="quota-compact">
          <div className="quota-info-row">
            <div className="quota-plan-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>workspace_premium</span>
              {quota.planName}
            </div>
            <span className="quota-count">
              <strong>{quota.used}</strong>/{quota.limit} câu hỏi đã dùng trong tháng
            </span>
          </div>
          <div className="quota-bar-track">
            <div
              className="quota-bar-fill"
              style={{ width: `${Math.min(percentage, 100)}%`, background: barColor }}
            />
          </div>
        </div>
      )}
      <Style />
    </div>
  );
};

const Style: React.FC = () => (
  <style>{`
    .quota-indicator {
      --quota-green: #10b981;
      --quota-yellow: #f59e0b;
      --quota-red: #ef4444;
      padding: 8px 24px;
      border-bottom: 1px solid var(--color-outline-variant);
      animation: fadeIn var(--transition-slow) both;
    }
    .quota-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
    }
    .quota-loading-text {
      font: var(--text-label-sm);
      color: var(--color-on-surface-variant);
    }

    /* ── Compact bar view ── */
    .quota-compact {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .quota-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .quota-plan-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border-radius: var(--radius-full);
      font: var(--text-label-sm);
      font-weight: 600;
      background: var(--color-primary-fixed);
      color: var(--color-primary);
      text-transform: capitalize;
    }
    .quota-count {
      font: var(--text-label-sm);
      color: var(--color-on-surface-variant);
    }
    .quota-count strong {
      color: var(--color-on-surface);
    }
    .quota-bar-track {
      width: 100%;
      height: 5px;
      background: var(--color-surface-container-high);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .quota-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1), background 300ms ease;
    }

    /* ── Exhausted alert ── */
    .quota-exhausted {
      padding: 10px 24px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.02));
    }
    .quota-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius-xl);
    }
    .quota-alert-icon {
      color: var(--quota-red);
      font-size: 22px !important;
      flex-shrink: 0;
      font-variation-settings: 'FILL' 1;
    }
    .quota-alert-body {
      flex: 1;
      min-width: 0;
    }
    .quota-alert-title {
      font: var(--text-label-md);
      color: var(--quota-red);
      font-weight: 700;
    }
    .quota-alert-desc {
      font: var(--text-label-sm);
      color: var(--color-on-surface-variant);
      margin-top: 2px;
    }
    .quota-upgrade-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-container));
      color: white;
      border-radius: var(--radius-full);
      font: var(--text-label-md);
      white-space: nowrap;
      flex-shrink: 0;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      box-shadow: var(--shadow-sm);
    }
    .quota-upgrade-btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    .quota-upgrade-btn:active {
      transform: scale(0.97);
    }

    @media (max-width: 600px) {
      .quota-alert {
        flex-direction: column;
        text-align: center;
      }
    }
  `}</style>
);
