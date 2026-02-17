import React from 'react';
import { Task } from '../types';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
  tasks: Task[];
}

const DetailPanel: React.FC<DetailPanelProps> = ({ tasks }) => {
  return (
    <div className={styles.detailPanel} role="region" aria-label="Feature details">
      <div className={styles.detailContent}>
        <h2>Task Details View</h2>
        <p>Total Tasks: {tasks.length}</p>
        {/* TODO: Implement detailed task list view */}
      </div>
    </div>
  );
};

export default DetailPanel;
