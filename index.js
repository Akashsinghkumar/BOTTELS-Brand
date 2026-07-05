// Root entry point for Render, Vercel, and other hosts
try {
  const app = require('./server/index.js');
  module.exports = app;
} catch (err) {
  console.error('Failed to start server from root index.js:', err);
  process.exit(1);
}
