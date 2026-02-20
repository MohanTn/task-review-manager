import React, { useState, useEffect } from 'react';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
import { Feature } from '../types';
import ContentHeader from './ContentHeader';
import Board from './Board';
import DetailPanel from './DetailPanel';
import styles from './MainContent.module.css';

const MainContent: React.FC = () => {
  const {
    currentRepo,
    currentFeatureSlug,
    currentTasks,
    setCurrentTasks,
    currentView,
    loading,
    setLoading,
    autoRefresh,
  } = useAppState();

  const [featureTitle, setFeatureTitle] = useState('');
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [showEmpty, setShowEmpty] = useState(true);

  useEffect(() => {
    if (currentFeatureSlug) {
      loadFeatureTasks();
    } else {
      setShowEmpty(true);
    }
  }, [currentFeatureSlug, currentRepo]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh || !currentFeatureSlug) {
      return;
    }

    const intervalId = setInterval(() => {
      loadFeatureTasks();
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [autoRefresh, currentFeatureSlug, currentRepo]);

  const loadFeatureTasks = async () => {
    if (!currentFeatureSlug) return;

    setLoading(true);
    try {
      const [summary, feature, details] = await Promise.all([
        APIClient.getTasks(currentRepo, currentFeatureSlug),
        APIClient.getFeature(currentRepo, currentFeatureSlug),
        APIClient.getFeatureDetails(currentRepo, currentFeatureSlug).catch(() => null)
      ]);

      setFeatureTitle(summary.featureTitle || currentFeatureSlug);
      setCurrentTasks(summary.tasks || []);

      // Merge feature with details (AC, test scenarios, clarifications, steps, attachments)
      const featureWithDetails = {
        ...feature,
        acceptanceCriteria: details?.acceptanceCriteria || [],
        testScenarios: details?.testScenarios || [],
        description: details?.feature?.description || feature.description || '',
        clarifications: details?.clarifications || [],
        refinementSteps: details?.refinementSteps || [],
        attachments: details?.attachments || [],
      };
      setCurrentFeature(featureWithDetails);
      setShowEmpty(false);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setShowEmpty(true);
    } finally {
      setLoading(false);
    }
  };

  if (showEmpty || !currentFeatureSlug) {
    return (
      <main className={styles.mainContent} id="main-content" role="main">
        <div className={styles.emptyBoard}>
          <div className={styles.emptyBoardInner}>
            <div className={styles.emptyBoardIcon}>&#9688;</div>
            <p className={styles.emptyBoardText}>Select a feature to view tasks</p>
            <p className={styles.emptyBoardHint}>
              Choose from the sidebar or create a new feature
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.mainContent} id="main-content" role="main">
      <ContentHeader
        featureTitle={featureTitle}
        tasks={currentTasks}
      />
      
      <div className={styles.contentBody}>
        {currentView === 'board' ? (
          <Board tasks={currentTasks} />
        ) : (
          <DetailPanel tasks={currentTasks} feature={currentFeature} />
        )}
      </div>
    </main>
  );
};

export default MainContent;
