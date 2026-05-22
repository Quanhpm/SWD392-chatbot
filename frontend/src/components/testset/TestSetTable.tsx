import React, { useState } from 'react';
import type { TestQuestion } from '../../types/index.js';
import { TestSetRow } from './TestSetRow.js';
import { EmptyState } from '../shared/EmptyState.js';
import { Icon } from '../shared/Icon.js';

interface TestSetTableProps {
  questions: TestQuestion[];
}

export const TestSetTable: React.FC<TestSetTableProps> = ({ questions }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.groundTruthAnswer.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === 'all' || q.category === category;
    const matchesDifficulty = difficulty === 'all' || q.difficulty === difficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="test-set-table-container">
      {/* Filters bar */}
      <div className="filters-bar flex-center">
        <div className="search-wrapper flex-center">
          <Icon name="search" className="search-icon" />
          <input
            type="text"
            className="search-field"
            placeholder="Search evaluation questions & answers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-btn flex-center" onClick={() => setSearch('')}>
              <Icon name="close" style={{ fontSize: '18px' }} />
            </button>
          )}
        </div>

        <div className="dropdowns flex-center">
          <select
            className="form-input form-select filter-dropdown"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="factual">Factual</option>
            <option value="conceptual">Conceptual</option>
            <option value="comparison">Comparison</option>
            <option value="application">Application</option>
          </select>

          <select
            className="form-input form-select filter-dropdown"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Grid listing */}
      {filteredQuestions.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No questions found"
          description="Try broadening your search or resetting category & difficulty filters."
        />
      ) : (
        <div className="table-responsive">
          <table className="test-questions-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Question Context</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Chapter</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q, idx) => (
                <TestSetRow key={q.id} question={q} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .test-set-table-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .filters-bar {
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .search-wrapper {
          flex: 1;
          min-width: 280px;
          background-color: var(--color-surface-container-low);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-xl);
          padding: 8px 16px;
          gap: 12px;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }
        .search-wrapper:focus-within {
          border-color: var(--color-primary);
          background-color: var(--color-surface-container-lowest);
        }
        .search-icon {
          color: var(--color-secondary);
        }
        .search-field {
          flex: 1;
          background: none;
          border: none;
          font: var(--text-body-md);
          color: var(--color-on-surface);
        }
        .clear-btn {
          color: var(--color-secondary);
        }
        .dropdowns {
          gap: 12px;
        }
        .filter-dropdown {
          min-width: 140px;
          background-color: var(--color-surface-container-low);
        }

        .table-responsive {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .test-questions-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .test-questions-table th {
          background-color: var(--color-surface-container-low);
          padding: 14px 16px;
          font: var(--text-label-md);
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: var(--text-label-md-spacing);
          border-bottom: 1px solid var(--color-outline-variant);
        }
      `}</style>
    </div>
  );
};
