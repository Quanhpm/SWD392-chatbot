import React, { useState } from 'react';
import type { TestQuestion } from '../../types/index.js';
import { Badge } from '../shared/Badge.js';
import { Icon } from '../shared/Icon.js';

interface TestSetRowProps {
  question: TestQuestion;
  index: number;
}

export const TestSetRow: React.FC<TestSetRowProps> = ({ question, index }) => {
  const [expanded, setExpanded] = useState(false);

  const getDifficultyBadge = (difficulty: string) => {
    if (difficulty === 'easy') return <Badge variant="success">Easy</Badge>;
    if (difficulty === 'medium') return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="error">Hard</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    if (category === 'factual') return <Badge variant="info">Factual</Badge>;
    if (category === 'conceptual') return <Badge variant="default">Conceptual</Badge>;
    if (category === 'comparison') return <Badge variant="warning">Comparison</Badge>;
    return <Badge variant="success">Application</Badge>;
  };

  return (
    <>
      <tr
        className={`test-set-row ${expanded ? 'expanded-active' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="row-number">{index + 1}</td>
        <td className="row-question">
          <div className="flex-center q-wrapper">
            <Icon name={expanded ? 'expand_less' : 'expand_more'} className="expand-chevron" />
            <span className="question-text text-truncate">{question.question}</span>
          </div>
        </td>
        <td>{getCategoryBadge(question.category)}</td>
        <td>{getDifficultyBadge(question.difficulty)}</td>
        <td className="row-chapter">Ch. {question.chapter}</td>
      </tr>

      {/* Expanded ground truth panel */}
      {expanded && (
        <tr className="expanded-panel-row fade-in">
          <td colSpan={5} className="expanded-cell">
            <div className="panel-inner">
              <div className="inner-section">
                <span className="panel-section-title">Full Question</span>
                <p className="full-question-text">{question.question}</p>
              </div>

              <div className="inner-section">
                <span className="panel-section-title">Ground Truth Answer</span>
                <p className="ground-truth-text">{question.groundTruthAnswer}</p>
              </div>

              <div className="inner-grid">
                <div className="inner-section">
                  <span className="panel-section-title">Source Reference</span>
                  <div className="flex-center source-box">
                    <Icon name="menu_book" style={{ fontSize: '18px', color: 'var(--color-primary)' }} />
                    <span className="source-doc-label">{question.sourceDocument}</span>
                  </div>
                </div>

                <div className="inner-section">
                  <span className="panel-section-title">Expected Keywords</span>
                  <div className="keyword-chips flex-center">
                    {question.expectedKeywords.map((kw) => (
                      <span key={kw} className="keyword-chip">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      <style>{`
        .test-set-row {
          border-bottom: 1px solid var(--color-outline-variant);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .test-set-row:hover {
          background-color: var(--color-surface-container-low);
        }
        .test-set-row.expanded-active {
          background-color: var(--color-surface-container);
        }
        .test-set-row td {
          padding: 14px 16px;
          vertical-align: middle;
          font: var(--text-body-md);
          color: var(--color-on-surface);
        }
        .row-number {
          font-weight: 600;
          color: var(--color-secondary);
          width: 50px;
        }
        .row-question {
          max-width: 420px;
        }
        .q-wrapper {
          justify-content: flex-start;
          gap: 8px;
        }
        .expand-chevron {
          color: var(--color-secondary);
        }
        .question-text {
          font-weight: 500;
        }
        .row-chapter {
          font-weight: 600;
          color: var(--color-primary);
        }

        /* Expanded Panel */
        .expanded-panel-row {
          background-color: var(--color-background);
        }
        .expanded-cell {
          padding: 0 !important;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .panel-inner {
          padding: 24px var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-left: 4px solid var(--color-primary);
        }
        .inner-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .panel-section-title {
          font: var(--text-label-md);
          color: var(--color-secondary);
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
        }
        .full-question-text {
          font: var(--text-body-lg);
          font-weight: 600;
          color: var(--color-on-surface);
        }
        .ground-truth-text {
          font: var(--text-body-md);
          line-height: 1.6;
          color: var(--color-on-surface-variant);
          background-color: var(--color-surface-container-lowest);
          padding: 12px 16px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-outline-variant);
        }
        .inner-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
        }
        .source-box {
          justify-content: flex-start;
          gap: 8px;
          background-color: var(--color-primary-fixed);
          color: var(--color-on-primary-fixed);
          padding: 8px 12px;
          border-radius: var(--radius-lg);
          font-weight: 500;
          width: fit-content;
        }
        .keyword-chips {
          justify-content: flex-start;
          gap: 6px;
          flex-wrap: wrap;
        }
        .keyword-chip {
          background-color: var(--color-surface-container-highest);
          border: 1px solid var(--color-outline-variant);
          padding: 4px 8px;
          border-radius: var(--radius-md);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: lowercase;
        }

        @media (max-width: 767.98px) {
          .inner-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </>
  );
};
