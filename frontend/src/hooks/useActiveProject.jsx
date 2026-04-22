import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

/**
 * ActiveProjectContext — stores the currently active project.
 * All viewer pages (FloorPlan, MEP, Scheduler, TaskGraph, CostEstimator)
 * read from here instead of each doing their own api.get('/projects').
 */
const ActiveProjectContext = createContext(null);

export function ActiveProjectProvider({ children }) {
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Fetch and set a project by ID */
  const loadProject = useCallback(async (projectId) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/projects/${projectId}`);
      setActiveProject(res.data);
      console.log(`[ActiveProject] Loaded: ${projectId}`, Object.keys(res.data));
    } catch (err) {
      console.error(`[ActiveProject] Failed to load ${projectId}:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Directly set project data (e.g. after pipeline completes) */
  const setProject = useCallback((project) => {
    setActiveProject(project);
    console.log(`[ActiveProject] Set directly:`, project?.id);
  }, []);

  /** Clear active project */
  const clearProject = useCallback(() => {
    setActiveProject(null);
  }, []);

  return (
    <ActiveProjectContext.Provider value={{
      project: activeProject,
      loading,
      error,
      loadProject,
      setProject,
      clearProject,
    }}>
      {children}
    </ActiveProjectContext.Provider>
  );
}

export function useActiveProject() {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error('useActiveProject must be used within ActiveProjectProvider');
  }
  return ctx;
}

export default ActiveProjectContext;
