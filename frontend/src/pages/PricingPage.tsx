import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { ISubscriptionPlan, IUserSubscription } from '../types/index.js';
import * as subscriptionApi from '../services/subscriptionApi.js';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { state: authState } = useAuth();
  const role = authState.user?.role;

  const [plans, setPlans] = useState<ISubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<IUserSubscription | null>(null);
  const [currentPlanName, setCurrentPlanName] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansData, subData] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getMySubscription(),
      ]);
      setPlans(plansData.sort((a, b) => a.sortOrder - b.sortOrder));
      setCurrentSub(subData.subscription);
      setCurrentPlanName(subData.plan?.name ?? 'free');
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSubscribe = async (planName: string) => {
    try {
      setSubscribing(planName);
      await subscriptionApi.subscribeToPlan(planName);
      setToast({ type: 'success', message: planName === 'free' ? 'Đã chuyển về gói Miễn phí!' : 'Gói demo đã được kích hoạt ngay.' });
      await fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại.' });
    } finally {
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number): string => {
    if (price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + 'đ/tháng';
  };

  const getPlanTier = (name: string): 'free' | 'plus' | 'pro' => {
    if (name === 'plus') return 'plus';
    if (name === 'pro') return 'pro';
    return 'free';
  };

  const isCurrentPlan = (planName: string) => {
    return role === 'student' && currentPlanName === planName && currentSub?.status !== 'cancelled';
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="flex-center" style={{ height: '60vh' }}>
          <span className="spinner" />
        </div>
        <PricingStyle />
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header">
        <button className="pricing-back-btn" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
        <div className="pricing-header-content">
          <div className="pricing-header-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>diamond</span>
          </div>
          <h1 className="pricing-title">Chọn gói phù hợp</h1>
          <p className="pricing-subtitle">
            Nâng cấp trải nghiệm học tập với EduSmart RAG Chatbot
          </p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="pricing-cards">
        {plans.map((plan) => {
          const tier = getPlanTier(plan.name);
          const isCurrent = isCurrentPlan(plan.name);
          const isPopular = tier === 'plus';
          const isPro = tier === 'pro';

          return (
            <div
              key={plan._id}
              className={`pricing-card pricing-card-${tier} ${isCurrent ? 'pricing-card-current' : ''} ${isPopular ? 'pricing-card-popular' : ''}`}
            >
              {isPopular && (
                <div className="pricing-popular-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>local_fire_department</span>
                  Phổ biến
                </div>
              )}
              {isPro && (
                <div className="pricing-pro-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                  Premium
                </div>
              )}

              <div className="pricing-card-header">
                <div className={`pricing-plan-icon pricing-plan-icon-${tier}`}>
                  <span className="material-symbols-outlined">
                    {tier === 'free' ? 'token' : tier === 'plus' ? 'bolt' : 'diamond'}
                  </span>
                </div>
                <h2 className="pricing-plan-name">{plan.displayName}</h2>
                <div className="pricing-plan-price">
                  {plan.price === 0 ? (
                    <span className="pricing-price-free">Miễn phí</span>
                  ) : (
                    <>
                      <span className="pricing-price-amount">{plan.price.toLocaleString('vi-VN')}đ</span>
                      <span className="pricing-price-period">/tháng</span>
                    </>
                  )}
                </div>
                <p className="pricing-plan-limit">
                  {plan.questionLimit} câu hỏi / tháng
                  {plan.durationDays ? ` · gói có hiệu lực ${plan.durationDays} ngày` : ''}
                </p>
              </div>

              <ul className="pricing-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="pricing-feature-item">
                    <span className="material-symbols-outlined pricing-feature-check">check_circle</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pricing-card-footer">
                {isCurrent ? (
                  <div className="pricing-current-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                    Gói hiện tại
                  </div>
                ) : (
                  <button
                    className={`pricing-subscribe-btn pricing-subscribe-btn-${tier}`}
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === plan.name ? (
                      <span className="spinner spinner-sm" style={{ borderTopColor: 'white' }} />
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {tier === 'free' ? 'download' : 'rocket_launch'}
                        </span>
                        {tier === 'free' ? 'Chọn gói' : 'Đăng ký ngay'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment info */}
      <div className="pricing-payment-info">
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-info)' }}>info</span>
        <p>Demo mode: không kết nối cổng thanh toán. Plus/Pro được kích hoạt ngay khi chọn.</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      <PricingStyle />
    </div>
  );
};

const PricingStyle: React.FC = () => (
  <style>{`
    .pricing-page {
      padding: var(--spacing-xl) var(--spacing-lg);
      max-width: 1120px;
      margin: 0 auto;
      min-height: 100%;
      animation: fadeIn var(--transition-slow) both;
    }

    /* ── Header ── */
    .pricing-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: var(--text-label-md);
      color: var(--color-on-surface-variant);
      padding: 8px 14px;
      border-radius: var(--radius-lg);
      transition: all var(--transition-fast);
      margin-bottom: var(--spacing-lg);
    }
    .pricing-back-btn:hover {
      background: var(--color-surface-container-high);
      color: var(--color-primary);
    }
    .pricing-header-content {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
    }
    .pricing-header-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--spacing-md);
      border-radius: var(--radius-2xl);
      background: var(--color-primary-fixed);
      border: 1px solid var(--color-primary-fixed-dim);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
    }
    .pricing-title {
      font: var(--text-headline-xl);
      color: var(--color-on-surface);
      letter-spacing: var(--text-display-spacing);
      margin-bottom: 8px;
    }
    .pricing-subtitle {
      font: var(--text-body-lg);
      color: var(--color-on-surface-variant);
    }

    /* ── Cards Grid ── */
    .pricing-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-lg);
      align-items: stretch;
    }

    .pricing-card {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--color-surface-container-lowest);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-2xl);
      padding: 26px var(--spacing-lg);
      transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
    }
    .pricing-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }

    /* Free card: muted */
    .pricing-card-free {
      opacity: 0.88;
    }
    .pricing-card-free:hover { opacity: 1; }

    /* Plus card: highlighted */
    .pricing-card-popular {
      border-color: #93c5fd;
      box-shadow: 0 0 0 1px #93c5fd;
    }
    .pricing-card-popular:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-md);
    }

    /* Pro card: gradient border */
    .pricing-card-pro {
      border-color: var(--color-outline-variant);
      background: var(--color-surface-container-lowest);
    }
    .pricing-card-pro:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }

    /* Current plan glow */
    .pricing-card-current {
      border-color: var(--color-secondary);
    }

    /* ── Badges ── */
    .pricing-popular-badge,
    .pricing-pro-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 14px;
      border-radius: var(--radius-full);
      font: var(--text-label-sm);
      font-weight: 700;
      white-space: nowrap;
    }
    .pricing-popular-badge {
      background: var(--color-primary);
      color: white;
    }
    .pricing-pro-badge {
      background: #0f172a;
      color: white;
    }

    /* ── Card Header ── */
    .pricing-card-header {
      text-align: center;
      margin-bottom: var(--spacing-lg);
    }
    .pricing-plan-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto var(--spacing-md);
      border-radius: var(--radius-xl);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .pricing-plan-icon-free {
      background: var(--color-surface-container-high);
      color: var(--color-on-surface-variant);
    }
    .pricing-plan-icon-plus {
      background: var(--color-primary-fixed);
      color: var(--color-primary);
    }
    .pricing-plan-icon-pro {
      background: #f1f5f9;
      color: #334155;
    }
    .pricing-plan-name {
      font: var(--text-headline-md);
      color: var(--color-on-surface);
      margin-bottom: 8px;
    }
    .pricing-plan-price {
      margin-bottom: 4px;
    }
    .pricing-price-free {
      font: var(--text-headline-lg);
      color: var(--color-on-surface-variant);
    }
    .pricing-price-amount {
      font-size: 32px;
      font-weight: 800;
      color: var(--color-on-surface);
      letter-spacing: -0.02em;
    }
    .pricing-price-period {
      font: var(--text-body-md);
      color: var(--color-on-surface-variant);
    }
    .pricing-plan-limit {
      font: var(--text-label-sm);
      color: var(--color-outline);
      margin-top: 4px;
    }

    /* ── Features ── */
    .pricing-features {
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: var(--spacing-lg);
    }
    .pricing-feature-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font: var(--text-body-sm);
      color: var(--color-on-surface-variant);
      line-height: 1.5;
    }
    .pricing-feature-check {
      color: var(--color-secondary);
      font-size: 18px !important;
      font-variation-settings: 'FILL' 1;
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* ── Footer ── */
    .pricing-card-footer {
      margin-top: auto;
    }
    .pricing-subscribe-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border-radius: var(--radius-lg);
      font: var(--text-label-md);
      font-weight: 700;
      transition: all var(--transition-fast);
    }
    .pricing-subscribe-btn:hover {
      filter: brightness(.97);
    }
    .pricing-subscribe-btn:active {
      transform: scale(0.98);
    }
    .pricing-subscribe-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .pricing-subscribe-btn-free {
      background: var(--color-surface-container-high);
      color: var(--color-on-surface);
    }
    .pricing-subscribe-btn-free:hover {
      background: var(--color-surface-container-highest);
    }
    .pricing-subscribe-btn-plus {
      background: var(--color-primary);
      color: white;
    }
    .pricing-subscribe-btn-plus:hover {
      background: var(--color-primary-container);
    }
    .pricing-subscribe-btn-pro {
      background: #0f172a;
      color: white;
    }
    .pricing-subscribe-btn-pro:hover {
      background: #1e293b;
    }

    .pricing-current-badge {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border-radius: var(--radius-xl);
      font: var(--text-label-md);
      font-weight: 700;
      background: var(--color-secondary-container);
      color: var(--color-on-secondary-container);
    }
    /* ── Payment info ── */
    .pricing-payment-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: var(--spacing-md) var(--spacing-lg);
      margin-top: var(--spacing-2xl);
      background: var(--color-surface-container-low);
      border-radius: var(--radius-2xl);
      border: 1px solid var(--color-outline-variant);
    }
    .pricing-payment-info p {
      font: var(--text-body-sm);
      color: var(--color-on-surface-variant);
      line-height: 1.6;
    }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .pricing-cards {
        grid-template-columns: 1fr;
        max-width: 400px;
        margin: 0 auto;
      }
      .pricing-card-popular {
        transform: none;
      }
      .pricing-card-popular:hover {
        transform: translateY(-4px);
      }
    }
    @media (min-width: 901px) and (max-width: 1100px) {
      .pricing-cards {
        gap: var(--spacing-md);
      }
      .pricing-card {
        padding: var(--spacing-lg) var(--spacing-md);
      }
    }
  `}</style>
);
