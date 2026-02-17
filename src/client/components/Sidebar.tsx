import React, { useState, useEffect } from 'react';
import { useAppState } from '../state/AppState';
import { APIClient } from '../api/client';
import { Repo } from '../types';
import RepoGroup from './RepoGroup';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { repos, setRepos, currentRepo, setCurrentRepo, currentFeatureSlug, setCurrentFeature, autoRefresh } = useAppState();
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set(['default']));

  useEffect(() => {
    loadRepos();
  }, []);

  // Auto-refresh repos and features
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const intervalId = setInterval(() => {
      loadRepos();
    }, 10000); // Refresh every 10 seconds (less frequent than tasks)

    return () => clearInterval(intervalId);
  }, [autoRefresh]);

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
  };

  if (collapsed) {
    return null;
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
          />
        ))}
      </div>
    </nav>
  );
};

export default Sidebar;
