const { createSeedData } = require('./data/seedData');

// ── In-memory data store ─────────────────────────────────────────────────
const seed = createSeedData();

const store = {
  projects: new Map(seed.projects.map(p => [p.id, p])),
  activities: [...seed.activities],
  notifications: [...seed.notifications],
  users: new Map(seed.users.map(u => [u.id, u])),
  sessions: new Map(), // token → userId

  // ── Project helpers ─────────────────────────────────────────────────
  getProjects(filters = {}) {
    let list = Array.from(this.projects.values());
    if (filters.status && filters.status !== 'all') {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.type && filters.type !== 'all') {
      list = list.filter(p => p.buildingType === filters.type);
    }
    if (filters.sort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  },

  getProject(id) {
    return this.projects.get(id) || null;
  },

  createProject(data) {
    this.projects.set(data.id, data);
    this.addActivity('plus', `New project created: ${data.name}`, data.id);
    this.addNotification('success', 'Project Created', `${data.name} has been created successfully`, data.id);
    return data;
  },

  updateProject(id, updates) {
    const proj = this.projects.get(id);
    if (!proj) return null;
    const updated = { ...proj, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  },

  deleteProject(id) {
    return this.projects.delete(id);
  },

  // ── Activity helpers ────────────────────────────────────────────────
  addActivity(icon, text, projectId) {
    const activity = {
      id: 'a' + Date.now(),
      icon,
      text,
      time: new Date().toISOString(),
      projectId
    };
    this.activities.unshift(activity);
    if (this.activities.length > 50) this.activities.pop();
    return activity;
  },

  // ── Notification helpers ────────────────────────────────────────────
  addNotification(type, title, message, projectId) {
    const notif = {
      id: 'n' + Date.now(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      projectId
    };
    this.notifications.unshift(notif);
    return notif;
  },

  markNotificationRead(id) {
    const n = this.notifications.find(n => n.id === id);
    if (n) n.read = true;
    return n;
  },

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  },

  // ── Stats ──────────────────────────────────────────────────────────
  getStats() {
    const projects = Array.from(this.projects.values());
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status !== 'completed').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
      avgProgress: Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / Math.max(projects.length, 1)),
    };
  }
};

module.exports = store;
