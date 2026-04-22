require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 8000,
  PYTHON_BIM_URL: process.env.PYTHON_BIM_URL || 'http://127.0.0.1:8001',
  JWT_SECRET: process.env.JWT_SECRET || 'bmh-dev-secret-key-2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
