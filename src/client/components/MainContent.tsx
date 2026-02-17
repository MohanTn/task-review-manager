import React, { useState, useEffect } from 'react';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
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
  } = useAppState();

  const [featureTitle, setFeatureTitle] = useState('');
  const [showEmpty, setShowEmpty] = useState(true);

  useEffect(() => {
    if (currentFeatureSlug) {
      loadFeatureTasks();
    } else {
      setShowEmpty(true);
    }
  }, [currentFeatureSlug, currentRepo]);

  const loadFeatureTasks = async () => {
    if (!currentFeatureSlug) return;
    
    setLoading(true);
    try {
      const summary = await APIClient.getTasks(currentRepo, currentFeatureSlug);
      setFeatureTitle(summary.featureTitle || currentFeatureSlug);
      setCurrentTasks(summary.tasks || []);
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
          <DetailPanel tasks={currentTasks} />
        )}
      </div>
    </main>
  );
};

export default MainContent;
