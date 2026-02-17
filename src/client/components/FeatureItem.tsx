import React from 'react';
import { Feature } from '../types';
import styles from './Sidebar.module.css';

interface FeatureItemProps {
  feature: Feature;
  active: boolean;
  onClick: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ feature, active, onClick }) => {
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
    </div>
  );
};

export default FeatureItem;
