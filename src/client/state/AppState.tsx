import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Repo, Task } from '../types';

interface AppState {
  repos: Repo[];
  currentRepo: string;
  currentFeatureSlug: string;
  currentTasks: Task[];
  currentView: 'board' | 'detail' | 'settings';
  searchQuery: string;
  loading: boolean;
}

interface AppStateContextType extends AppState {
  setRepos: (repos: Repo[]) => void;
  setCurrentRepo: (repoName: string) => void;
  setCurrentFeature: (slug: string) => void;
  setCurrentTasks: (tasks: Task[]) => void;
  setCurrentView: (view: 'board' | 'detail' | 'settings') => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  refreshData: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    repos: [],
    currentRepo: 'default',
    currentFeatureSlug: '',
    currentTasks: [],
    currentView: 'board',
    searchQuery: '',
    loading: false,
  });

  const setRepos = useCallback((repos: Repo[]) => {
    setState(prev => ({ ...prev, repos }));
  }, []);

  const setCurrentRepo = useCallback((repoName: string) => {
    setState(prev => ({ ...prev, currentRepo: repoName }));
  }, []);

  const setCurrentFeature = useCallback((slug: string) => {
    setState(prev => ({ ...prev, currentFeatureSlug: slug }));
  }, []);

  const setCurrentTasks = useCallback((tasks: Task[]) => {
    setState(prev => ({ ...prev, currentTasks: tasks }));
  }, []);

  const setCurrentView = useCallback((view: 'board' | 'detail' | 'settings') => {
    setState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const refreshData = useCallback(async () => {
    // Implemented by components that need to refresh
  }, []);

  const value: AppStateContextType = {
    ...state,
    setRepos,
    setCurrentRepo,
    setCurrentFeature,
    setCurrentTasks,
    setCurrentView,
    setSearchQuery,
    setLoading,
    refreshData,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};
