import React from 'react';
import type { TestQuestion } from '../../types/index.js';
import { Icon } from '../shared/Icon.js';

interface TestSetStatsProps {
  questions: TestQuestion[];
}

export const TestSetStats: React.FC<TestSetStatsProps> = ({ questions }) => {
  const total = questions.length;

  const countDifficulty = (diff: string) => questions.filter((q) => q.difficulty === diff).length;
  const countCategory = (cat: string) => questions.filter((q) => q.category === cat).length;

  return (
    <div className="test-stats-grid">
      {/* 1. Total Questions Card */}
      <div className="stat-card flex-center fade-in">
        <div className="stat-icon-wrapper flex-center total-icon">
          <Icon name="assignment" />
        </div>
        <div className="stat-details">
          <span className="stat-value">{total}</span>
          <span className="stat-label">Total Questions</span>
        </div>
      </div>

      {/* 2. Difficulty Breakdown Card */}
      <div className="stat-card flex-center fade-in">
        <div className="stat-icon-wrapper flex-center difficulty-icon">
          <Icon name="bolt" />
        </div>
        <div className="stat-details flex-1">
          <span className="stat-label">Difficulty Distribution</span>
          <div className="progress-list">
            <div className="prog-item">
              <span className="prog-label">Easy ({countDifficulty('easy')})</span>
              <div className="bar"><div className="fill bg-success" style={{ width: `${(countDifficulty('easy') / total) * 100}%` }} /></div>
            </div>
            <div className="prog-item">
              <span className="prog-label">Medium ({countDifficulty('medium')})</span>
              <div className="bar"><div className="fill bg-warning" style={{ width: `${(countDifficulty('medium') / total) * 100}%` }} /></div>
            </div>
            <div className="prog-item">
              <span className="prog-label">Hard ({countDifficulty('hard')})</span>
              <div className="bar"><div className="fill bg-error" style={{ width: `${(countDifficulty('hard') / total) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category Breakdown Card */}
      <div className="stat-card flex-center fade-in">
        <div className="stat-icon-wrapper flex-center category-icon">
          <Icon name="category" />
        </div>
        <div className="stat-details flex-1">
          <span className="stat-label">Category Mappings</span>
          <div className="progress-list">
            <div className="prog-item">
              <span className="prog-label">Factual ({countCategory('factual')})</span>
              <div className="bar"><div className="fill bg-info" style={{ width: `${(countCategory('factual') / total) * 100}%` }} /></div>
            </div>
            <div className="prog-item">
              <span className="prog-label">Conceptual ({countCategory('conceptual')})</span>
              <div className="bar"><div className="fill bg-secondary" style={{ width: `${(countCategory('conceptual') / total) * 100}%` }} /></div>
            </div>
            <div className="prog-item">
              <span className="prog-label">Comparison ({countCategory('comparison')})</span>
              <div className="bar"><div className="fill bg-warning" style={{ width: `${(countCategory('comparison') / total) * 100}%` }} /></div>
            </div>
            <div className="prog-item">
              <span className="prog-label">Application ({countCategory('application')})</span>
              <div className="bar"><div className="fill bg-success" style={{ width: `${(countCategory('application') / total) * 100}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .test-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr 1.5fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: 20px;
          gap: 18px;
          justify-content: flex-start;
          align-items: flex-start;
          box-shadow: var(--shadow-sm);
        }
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-xl);
          color: white;
          flex-shrink: 0;
        }
        .total-icon { background-color: var(--color-primary); }
        .difficulty-icon { background-color: var(--color-tertiary-container); }
        .category-icon { background-color: var(--color-secondary-container); color: var(--color-on-secondary-container); }

        .stat-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-value {
          font: var(--text-display);
          font-size: 36px;
          line-height: 40px;
          color: var(--color-on-surface);
        }
        .stat-label {
          font: var(--text-label-md);
          color: var(--color-secondary);
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
          margin-bottom: 4px;
        }

        /* Distribution Lists */
        .progress-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          margin-top: 4px;
        }
        .prog-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .prog-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 500;
          color: var(--color-on-surface-variant);
        }
        .bar {
          width: 100%;
          height: 4px;
          background-color: var(--color-surface-container-high);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .fill {
          height: 100%;
          border-radius: var(--radius-full);
        }
        .bg-success { background-color: var(--color-success); }
        .bg-warning { background-color: var(--color-warning); }
        .bg-error { background-color: var(--color-error); }
        .bg-info { background-color: var(--color-info); }
        .bg-secondary { background-color: var(--color-secondary); }

        @media (max-width: 1023.98px) {
          .test-stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};
