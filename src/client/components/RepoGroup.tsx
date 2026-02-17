import React from 'react';
import { Repo } from '../types';
import FeatureItem from './FeatureItem';
import styles from './Sidebar.module.css';

interface RepoGroupProps {
  repo: Repo;
  expanded: boolean;
  onToggle: () => void;
  onSelectFeature: (slug: string) => void;
  activeSlug: string;
}

const RepoGroup: React.FC<RepoGroupProps> = ({
  repo,
  expanded,
  onToggle,
  onSelectFeature,
  activeSlug,
}) => {
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
      </div>
      
      {expanded && (
        <div className={styles.repoFeatures}>
          {repo.features.map(feature => (
            <FeatureItem
              key={feature.featureSlug}
              feature={feature}
              active={feature.featureSlug === activeSlug}
              onClick={() => onSelectFeature(feature.featureSlug)}
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
