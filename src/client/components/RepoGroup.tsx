import React, { useState } from 'react';
import { Repo } from '../types';
import FeatureItem from './FeatureItem';
import styles from './Sidebar.module.css';

interface RepoGroupProps {
  repo: Repo;
  expanded: boolean;
  onToggle: () => void;
  onSelectFeature: (slug: string) => void;
  activeSlug: string;
  onDeleteRepo: () => Promise<void>;
  onDeleteFeature: (featureSlug: string) => Promise<void>;
}

const RepoGroup: React.FC<RepoGroupProps> = ({
  repo,
  expanded,
  onToggle,
  onSelectFeature,
  activeSlug,
  onDeleteRepo,
  onDeleteFeature,
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRepo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const featureCount = repo.features.length;
    const taskCount = repo.features.reduce((sum, f) => sum + (f.totalTasks ?? f.tasks?.length ?? 0), 0);
    const confirmed = window.confirm(
      `Delete repo "${repo.repoName}"?\n\nThis will permanently delete ${featureCount} feature(s) and ${taskCount} task(s). This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDeleteRepo();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`${styles.repoGroup} ${expanded ? styles.open : ''}`}>
      <div
        className={styles.repoGroupHeader}
        onClick={onToggle}
        role="treeitem"
        aria-expanded={expanded}
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className={styles.repoChevron}>▶</span>
        <span className={styles.repoNameText}>{repo.repoName}</span>
        <span className={styles.repoBadge}>{repo.features.length}</span>
        <button
          className={styles.deleteBtn}
          onClick={handleDeleteRepo}
          disabled={deleting}
          aria-label={`Delete repo: ${repo.repoName}`}
          title="Delete repository"
        >
          🗑
        </button>
      </div>

      {expanded && (
        <div className={styles.repoFeatures}>
          {repo.features.map(feature => (
            <FeatureItem
              key={feature.featureSlug}
              feature={feature}
              active={feature.featureSlug === activeSlug}
              onClick={() => onSelectFeature(feature.featureSlug)}
              onDelete={() => onDeleteFeature(feature.featureSlug)}
            />
          ))}
          {repo.features.length === 0 && (
            <div style={{ padding: '8px 26px', fontSize: '11px', color: 'var(--sidebar-text-muted)' }}>
              No features
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepoGroup;
