// server.prod-test.js
/* eslint-disable import/no-extraneous-dependencies */
const http = require('http');
const next = require('next');

async function main() {
  const app = next({ dev: false, dir: __dirname });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Request error:', err);
    });
  });

  server.listen(3000, () => {
    // eslint-disable-next-line no-console
    console.log('Prod test server listening on http://localhost:3000');
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Startup error:', err);
  process.exit(1);
});