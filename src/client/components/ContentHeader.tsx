import React from 'react';
import { useAppState } from '../state/AppState';
import { Task } from '../types';
import styles from './ContentHeader.module.css';

interface ContentHeaderProps {
  featureTitle: string;
  tasks: Task[];
}

const ContentHeader: React.FC<ContentHeaderProps> = ({ featureTitle, tasks }) => {
  const { currentView, setCurrentView, searchQuery, setSearchQuery } = useAppState();

  const stats = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'Done').length;
    const inFlight = tasks.filter(t =>
      ['InProgress', 'InReview', 'InQA'].includes(t.status)
    ).length;
    const blocked = tasks.filter(t =>
      ['NeedsChanges', 'NeedsRefinement'].includes(t.status)
    ).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, inFlight, blocked, percent };
  }, [tasks]);

  return (
    <div className={styles.contentHeader}>
      <div className={styles.contentHeaderLeft}>
        <div className={styles.featureHeadline}>{featureTitle}</div>
        <div className={styles.statsRow}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Done</span>
            <span className={`${styles.statValue} ${styles.highlight}`}>{stats.done}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>In Flight</span>
            <span className={styles.statValue}>{stats.inFlight}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Blocked</span>
            <span className={styles.statValue}>{stats.blocked}</span>
          </div>
          <div className={styles.statItem}>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuenow={stats.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={styles.progressFill} style={{ width: `${stats.percent}%` }}></div>
            </div>
            <span className={styles.statValue} style={{ fontSize: '13px', marginLeft: '6px' }}>
              {stats.percent}%
            </span>
          </div>
        </div>
      </div>

      <div className={styles.contentHeaderRight}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search tasks"
        />
        <div className={styles.viewToggle} role="group" aria-label="View mode">
          <button
            className={`${styles.viewBtn} ${currentView === 'board' ? styles.active : ''}`}
            onClick={() => setCurrentView('board')}
            aria-pressed={currentView === 'board'}
          >
            Board
          </button>
          <button
            className={`${styles.viewBtn} ${currentView === 'detail' ? styles.active : ''}`}
            onClick={() => setCurrentView('detail')}
            aria-pressed={currentView === 'detail'}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentHeader;
