import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
import { Repo } from '../types';
import RepoGroup from './RepoGroup';
import { useWebSocket } from '../hooks/useWebSocket';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { repos, setRepos, currentRepo, setCurrentRepo, currentFeatureSlug, setCurrentFeature, setCurrentView } = useAppState();
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set(['default']));

  const handleDeleteRepo = useCallback(async (repoName: string) => {
    await APIClient.deleteRepo(repoName);
    if (currentRepo === repoName) {
      setCurrentRepo('');
      setCurrentFeature('');
    }
    await loadRepos();
  }, [currentRepo]);

  const handleDeleteFeature = useCallback(async (repoName: string, featureSlug: string) => {
    await APIClient.deleteFeature(repoName, featureSlug);
    if (currentRepo === repoName && currentFeatureSlug === featureSlug) {
      setCurrentFeature('');
    }
    await loadRepos();
  }, [currentRepo, currentFeatureSlug]);

  useEffect(() => {
    loadRepos();
  }, []);

  // Refresh sidebar on WebSocket events for repos, features, or task changes
  useWebSocket({
    onMessage: useCallback((message: any) => {
      if (
        message.type === 'repo-changed' ||
        message.type === 'feature-changed' ||
        message.type === 'task-status-changed'
      ) {
        loadRepos();
      }
    }, []),
  });

  const loadRepos = async () => {
    try {
      const data = await APIClient.listRepos();
      const repoList: Repo[] = [];
      
      for (const [repoName, repoData] of Object.entries(data)) {
        const features = await APIClient.listFeatures(repoName);
        repoList.push({
          repoName,
          description: (repoData as any)?.description,
          features,
        });
      }
      
      setRepos(repoList);
    } catch (error) {
      console.error('Failed to load repos:', error);
    }
  };

  const toggleRepo = (repoName: string) => {
    const newExpanded = new Set(expandedRepos);
    if (newExpanded.has(repoName)) {
      newExpanded.delete(repoName);
    } else {
      newExpanded.add(repoName);
    }
    setExpandedRepos(newExpanded);
  };

  const selectFeature = (repoName: string, slug: string) => {
    setCurrentRepo(repoName);
    setCurrentFeature(slug);
    // Always navigate to the board when selecting a feature,
    // even if the user was on the settings page.
    setCurrentView('board');
  };

  if (collapsed) {
    // Return an empty nav to keep its grid slot, so MainContent stays in column 2.
    return <nav className={styles.sidebar} aria-hidden="true" style={{ overflow: 'hidden', width: 0 }} />;
  }

  return (
    <nav className={styles.sidebar} role="navigation" aria-label="Repository navigation">
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarActions}>
          <button
            className={styles.btnSidebarAction}
            onClick={() => console.log('Add Repo - TODO')}
            aria-label="Register a new repository"
          >
            + Repo
          </button>
          <button
            className={styles.btnSidebarAction}
            onClick={() => console.log('Add Feature - TODO')}
            aria-label="Create a new feature"
          >
            + Feature
          </button>
        </div>
      </div>
      
      <div className={styles.sidebarScroll} role="tree" aria-label="Repositories and features">
        {repos.map(repo => (
          <RepoGroup
            key={repo.repoName}
            repo={repo}
            expanded={expandedRepos.has(repo.repoName)}
            onToggle={() => toggleRepo(repo.repoName)}
            onSelectFeature={(slug) => selectFeature(repo.repoName, slug)}
            activeSlug={currentRepo === repo.repoName ? currentFeatureSlug : ''}
            onDeleteRepo={() => handleDeleteRepo(repo.repoName)}
            onDeleteFeature={(slug) => handleDeleteFeature(repo.repoName, slug)}
          />
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
