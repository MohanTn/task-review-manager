import React, { useState } from 'react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { AppStateProvider } from './state/AppState';
import './App.module.css';

const App: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <AppStateProvider>
      <div className="app">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <div className="sr-only" aria-live="polite" aria-atomic="true" id="ariaLive"></div>
        
        <Topbar 
          onToggleSidebar={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
        />
        
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-open'}`}>
          <Sidebar collapsed={sidebarCollapsed} />
          <MainContent />
        </div>
      </div>
    </AppStateProvider>
  );
};

export default App;
