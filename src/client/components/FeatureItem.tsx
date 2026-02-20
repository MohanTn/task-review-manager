import React, { useState } from 'react';
import { Feature } from '../types';
import styles from './Sidebar.module.css';

interface FeatureItemProps {
  feature: Feature;
  active: boolean;
  onClick: () => void;
  onDelete: () => Promise<void>;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ feature, active, onClick, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const taskCount = feature.totalTasks ?? feature.tasks?.length ?? 0;
    const confirmed = window.confirm(
      `Delete feature "${feature.title || feature.featureSlug}"?\n\nThis will remove the feature and its ${taskCount} task(s). This cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`${styles.sidebarFeatureItem} ${active ? styles.active : ''}`}
      onClick={onClick}
      role="treeitem"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className={styles.sidebarFeatureName}>{feature.title || feature.featureSlug}</span>
      <span className={styles.sidebarFeatureCount}>{feature.totalTasks ?? feature.tasks?.length ?? 0}</span>
      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Delete feature: ${feature.title || feature.featureSlug}`}
        title="Delete feature"
      >
        🗑
      </button>
    </div>
  );
};

export default FeatureItem;
