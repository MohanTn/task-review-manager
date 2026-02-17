import React from 'react';
import { useAppState } from '../state/AppState';
import styles from './Topbar.module.css';

interface TopbarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { autoRefresh, setAutoRefresh } = useAppState();

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <header className={styles.topbar} role="banner">
      <button
        className={styles.sidebarToggle}
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!sidebarCollapsed}
      >
        ☰
      </button>
      <span className={styles.topbarBrand}>
        &#10097;&#10097; <span>Agent</span> Orchestration Console
      </span>
      <div className={styles.topbarRight}>
        <div className={`${styles.liveDot} ${autoRefresh ? styles.active : ''}`} aria-hidden="true"></div>
        <span className={styles.topbarLabel}>Auto-refresh {autoRefresh ? '5s' : 'off'}</span>
        <button
          className={styles.btnIcon}
          onClick={toggleAutoRefresh}
          aria-label="Toggle auto-refresh"
          aria-pressed={autoRefresh}
          title="Toggle auto-refresh"
        >
          &#8635;
        </button>
      </div>
    </header>
  );
};

export default Topbar;
