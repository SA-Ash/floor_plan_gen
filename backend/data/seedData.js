const { v4: uuidv4 } = require('uuid');

/**
 * Minimal seed data — NO hardcoded BIM data.
 * Every project starts empty and must be generated through the AI pipeline.
 */
function createSeedData() {
  const now = new Date();
  const ago = (d) => new Date(now - d * 86400000).toISOString();

  const projects = [];
  const activities = [];
  const notifications = [];

  const users = [
    { id: 'user-1', name: 'Demo User', email: 'demo@buildmyhome.ai', avatar: 'D', role: 'architect' }
  ];

  return { projects, activities, notifications, users };
}

module.exports = { createSeedData };
