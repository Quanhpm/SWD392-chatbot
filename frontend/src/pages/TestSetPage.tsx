import React, { useEffect, useState } from 'react';
import { getTestSet } from '../services/testSetApi.js';
import type { TestSet } from '../types/index.js';
import { TestSetStats } from '../components/testset/TestSetStats.js';
import { TestSetTable } from '../components/testset/TestSetTable.js';
import { LoadingSpinner } from '../components/shared/LoadingSpinner.js';
import { ErrorToast } from '../components/shared/ErrorToast.js';

export const TestSetPage: React.FC = () => {
  const [testSet, setTestSet] = useState<TestSet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestSet = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTestSet();
        setTestSet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load evaluation test set');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTestSet();
  }, []);

  return (
    <div className="test-set-page fade-in">
      {error && <ErrorToast message={error} onDismiss={() => setError(null)} />}

      <div className="page-header">
        <h1 className="page-title">Model Evaluation Database</h1>
        <p className="page-subtitle">
          Explore the course ground truth Q&A benchmark. These {testSet?.totalQuestions || 50} questions represent 
          key concepts across multiple software engineering chapters and difficulty levels, used to evaluate chatbot response fidelity.
        </p>
      </div>

      {isLoading ? (
        <div className="loading-container flex-center">
          <LoadingSpinner label="Loading ground-truth evaluation database..." />
        </div>
      ) : testSet ? (
        <div className="test-set-content">
          {/* Stats breakdown grids */}
          <TestSetStats questions={testSet.questions} />

          {/* Interactive filterable tables */}
          <div className="page-content-card">
            <h2 className="card-title">Benchmark Question Repository</h2>
            <p className="card-subtitle">Filter by chapter, category, difficulty, or keyword context.</p>
            <TestSetTable questions={testSet.questions} />
          </div>
        </div>
      ) : (
        <div className="error-container flex-center">
          <p className="error-message">Failed to load the evaluation test set.</p>
        </div>
      )}

      <style>{`
        .test-set-page {
          padding: var(--page-margin);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .page-title {
          font: var(--text-headline-lg);
          color: var(--color-on-surface);
          font-weight: 600;
        }

        .page-subtitle {
          font: var(--text-body-lg);
          color: var(--color-on-surface-variant);
          max-width: 800px;
          line-height: 1.5;
        }

        .loading-container {
          min-height: 300px;
          width: 100%;
        }

        .error-container {
          min-height: 300px;
          color: var(--color-error);
          font: var(--text-body-lg);
        }

        .test-set-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .page-content-card {
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
        }

        .card-title {
          font: var(--text-headline-sm);
          font-size: 18px;
          font-weight: 600;
          color: var(--color-on-surface);
          margin-bottom: 4px;
        }

        .card-subtitle {
          font: var(--text-body-md);
          color: var(--color-on-surface-variant);
          margin-bottom: 20px;
        }

        @media (max-width: 767.98px) {
          .test-set-page {
            padding: var(--spacing-md);
            gap: var(--spacing-md);
          }

          .page-title {
            font: var(--text-headline-lg-mobile);
          }

          .page-content-card {
            padding: var(--spacing-md);
          }
        }
      `}</style>
    </div>
  );
};
