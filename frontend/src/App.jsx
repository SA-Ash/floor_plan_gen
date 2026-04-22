import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { ActiveProjectProvider } from './hooks/useActiveProject';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';

import Home from './pages/Home/Home';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectNew from './pages/ProjectNew/ProjectNew';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';
import FloorPlanViewer from './pages/FloorPlanViewer/FloorPlanViewer';
import CostEstimator from './pages/CostEstimator/CostEstimator';
import WorkerGuidance from './pages/WorkerGuidance/WorkerGuidance';
import MEPRouting from './pages/MEPRouting/MEPRouting';
import TaskGraph from './pages/TaskGraph/TaskGraph';
import Scheduler from './pages/Scheduler/Scheduler';
import Viewer3D from './pages/Viewer3D/Viewer3D';

import ToastContainer from './components/common/Toast';

import './styles/globals.css';
import './App.css';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const mainClass = isLanding
    ? 'app-main'
    : `app-main app-main-with-sidebar ${sidebarCollapsed ? 'app-main-collapsed' : ''}`;

  return (
    <div className="app-layout">
      <Header
        onToggleSidebar={() => {
          if (window.innerWidth >= 1024) {
            setSidebarCollapsed(!sidebarCollapsed);
          } else {
            setSidebarOpen(!sidebarOpen);
          }
        }}
      />
      {!isLanding && (
        <Sidebar
          isOpen={sidebarOpen}
          collapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
      <main className={mainClass}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects" element={<Dashboard />} />
          <Route path="/floor-plans" element={<FloorPlanViewer />} />
          <Route path="/cost-estimator" element={<CostEstimator />} />
          <Route path="/worker-guidance" element={<WorkerGuidance />} />
          <Route path="/mep-routing" element={<MEPRouting />} />
          <Route path="/task-graph" element={<TaskGraph />} />
          <Route path="/scheduler" element={<Scheduler />} />
          <Route path="/3d-viewer" element={<Viewer3D />} />
          <Route path="/settings" element={<Dashboard />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <ActiveProjectProvider>
        <Router>
          <AppLayout />
        </Router>
      </ActiveProjectProvider>
    </Provider>
  );
}
