// Root entry point for Render (and other hosts that run `node index.js`).
// It simply delegates to the server implementation in `server/index.js`.
try {
  require('./server/index.js');
} catch (err) {
  console.error('Failed to start server from root index.js:', err);
  process.exit(1);
}
