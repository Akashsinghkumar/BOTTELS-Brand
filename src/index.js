// Shim for Render: when Render runs `node index.js` from the `src` folder
// this file will be executed and delegate to the real root entrypoint.
try {
  // Resolve up one level to the repo root `index.js`
  require('../index.js');
} catch (err) {
  console.error('Failed to start application from src/index.js shim:', err);
  process.exit(1);
}
