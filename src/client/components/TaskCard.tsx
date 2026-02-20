import React from 'react';
import { Task } from '../types';
import { formatStatus, getBadgeClass } from '../utils/formatters';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  onTaskClick?: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick }) => {
  const handleClick = () => {
    onTaskClick?.(task.taskId);
  };

  return (
    <div
      className={styles.card}
      role="listitem"
      tabIndex={0}
      onClick={handleClick}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.taskId}>{task.taskId}</span>
        <span className={`${styles.badge} ${styles[getBadgeClass(task.status)]}`}>
          {formatStatus(task.status)}
        </span>
      </div>
      <div className={styles.cardTitle}>{task.title}</div>
      {task.description && (
        <div className={styles.cardDesc}>{task.description}</div>
      )}
      <div className={styles.cardFooter}>
        {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
          <span className={styles.cardMeta}>
            ✓ {task.acceptanceCriteria.length} AC
          </span>
        )}
        {task.testScenarios && task.testScenarios.length > 0 && (
          <span className={styles.cardMeta}>
            ⚡ {task.testScenarios.length} TS
          </span>
        )}
        {task.estimatedHours && (
          <span className={styles.cardMeta}>
            ⏱ {task.estimatedHours}h
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
