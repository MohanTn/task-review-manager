import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
import { Feature } from '../types';
import ContentHeader from './ContentHeader';
import Board from './Board';
import DetailPanel from './DetailPanel';
import SettingsPage from './SettingsPage';
import { useWebSocket } from '../hooks/useWebSocket';
import styles from './MainContent.module.css';

const MainContent: React.FC = () => {
  const {
    currentRepo,
    currentFeatureSlug,
    currentTasks,
    setCurrentTasks,
    currentView,
    setLoading,
  } = useAppState();

  const [featureTitle, setFeatureTitle] = useState('');
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [showEmpty, setShowEmpty] = useState(true);

  const loadFeatureTasks = useCallback(async () => {
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
  }, [currentFeatureSlug, currentRepo]);

  useEffect(() => {
    if (currentFeatureSlug) {
      loadFeatureTasks();
    } else {
      setShowEmpty(true);
    }
  }, [currentFeatureSlug, currentRepo, loadFeatureTasks]);

  // Refresh tasks on WebSocket task-status-changed events
  useWebSocket({
    onMessage: useCallback((message: any) => {
      if (message.type === 'task-status-changed' && currentFeatureSlug) {
        loadFeatureTasks();
      }
    }, [currentFeatureSlug, loadFeatureTasks]),
  });

  if (showEmpty || !currentFeatureSlug) {
    // Still allow settings view even with no feature selected
    if (currentView === 'settings') {
      return <SettingsPage />;
    }
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

  if (currentView === 'settings') {
    return <SettingsPage />;
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
