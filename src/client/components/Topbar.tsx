import React, { useRef } from 'react';
import { useAppState } from '../state/AppState';
import { useWebSocket } from '../hooks/useWebSocket';
import styles from './Topbar.module.css';

interface TopbarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, sidebarCollapsed }) => {
  const { currentView, setCurrentView } = useAppState();
  const { connected } = useWebSocket();
  // Remember the view that was active before settings was opened,
  // so we can restore it precisely when settings is closed.
  const prevViewRef = useRef<'board' | 'detail'>('board');

  const toggleSettings = () => {
    if (currentView === 'settings') {
      // Restore the view that was active before settings was opened.
      setCurrentView(prevViewRef.current);
    } else {
      // Save current view (board | detail) before navigating to settings.
      prevViewRef.current = currentView as 'board' | 'detail';
      setCurrentView('settings');
    }
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
        &#10097;&#10097; <span>AI</span>Conductor
      </span>
      <div className={styles.topbarRight}>
        <div className={`${styles.liveDot} ${connected ? styles.active : ''}`} aria-hidden="true"></div>
        <span className={styles.topbarLabel}>Live {connected ? 'connected' : 'disconnected'}</span>
        <button
          className={`${styles.btnIcon} ${currentView === 'settings' ? styles.btnIconActive : ''}`}
          onClick={toggleSettings}
          aria-label="Toggle settings"
          aria-pressed={currentView === 'settings'}
          title="Role Prompt Settings"
        >
          &#9881;
        </button>
      </div>
    </header>
  );
};

export default Topbar;
