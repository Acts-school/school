const { app, BrowserWindow, dialog } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const next = require('next');
const dotenv = require('dotenv');

/**
 * Minimal Electron main process for desktop shell.
 *
 * Dev mode (npm run electron:dev):
 * - "next dev" runs the Next.js server on http://localhost:3000
 * - this process just opens a BrowserWindow pointing at that URL
 *
 * Production/packaged behavior (starting point):
 * - still loads http://localhost:3000; server startup will be wired later
 */

// Treat Electron as dev whenever the app is not packaged,
// regardless of NODE_ENV from Next/.env.
const isDev = !app.isPackaged;
const NEXT_URL = 'http://localhost:3000';
const NEXT_PORT = 3000;
const LOG_FILE_NAME = 'eacts-desktop.log';

function logToFile(message) {
  try {
    const logDir = app.getPath('userData');
    const logPath = path.join(logDir, LOG_FILE_NAME);
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logPath, line, { encoding: 'utf8' });
  } catch {
    // Swallow logging errors to avoid crashing the app
  }
}

// ---- INTERCEPT CONSOLE LOGS ----
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile(`[LOG] ${msg}`);
};

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  const msg = args.map(a => (a instanceof Error ? a.stack || a.message : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile(`[ERROR] ${msg}`);
};

console.warn = function (...args) {
  originalConsoleWarn.apply(console, args);
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logToFile(`[WARN] ${msg}`);
};

process.on('uncaughtException', (error) => {
  logToFile(`[UNCAUGHT EXCEPTION] ${error && error.stack ? error.stack : error}`);
});

process.on('unhandledRejection', (reason) => {
  logToFile(`[UNHANDLED REJECTION] Reason: ${reason && reason.stack ? reason.stack : reason}`);
});
// --------------------------------

function waitForServer(url, timeoutMs) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve();
          } else if (Date.now() - start > timeoutMs) {
            reject(new Error(`Server at ${url} not ready, status ${String(res.statusCode)}`));
          } else {
            setTimeout(attempt, 500);
          }
        })
        .on('error', () => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error(`Timed out waiting for server at ${url}`));
          } else {
            setTimeout(attempt, 500);
          }
        });
    };

    attempt();
  });
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  void mainWindow.loadURL(NEXT_URL);
}

async function startNextInProd() {
  if (isDev) {
    return;
  }

  const appPath = app.getAppPath();

  // Load desktop-specific environment variables for the packaged app
  try {
    const envPath = path.join(appPath, '.env.desktop');
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      logToFile(`Failed to load .env.desktop from ${envPath}: ${String(result.error)}`);
    } else {
      logToFile(`Loaded .env.desktop from ${envPath}`);
    }
  } catch (error) {
    logToFile(`Error while loading .env.desktop: ${String(error instanceof Error ? error.message : error)}`);
  }

  logToFile(`DATABASE_URL present: ${process.env.DATABASE_URL ? 'yes' : 'no'}`);

  try {
    logToFile('Starting Next.js in production mode...');

    const nextApp = next({
      dev: false,
      dir: appPath,
    });

    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    const server = http.createServer((req, res) => {
      handle(req, res).catch((error) => {
        logToFile(`Request handler error: ${String(error instanceof Error ? error.stack ?? error.message : error)}`);
      });
    });

    await new Promise((resolve, reject) => {
      server.once('error', (error) => {
        logToFile(`HTTP server failed to start: ${String(error instanceof Error ? error.stack ?? error.message : error)}`);
        reject(error);
      });

      server.listen(NEXT_PORT, () => {
        logToFile(`Next.js server listening on port ${NEXT_PORT}`);
        resolve();
      });
    });

    await waitForServer(NEXT_URL, 30000);
  } catch (error) {
    const message = `Failed to start embedded Next.js server: ${String(
      error instanceof Error ? error.message : error,
    )}`;
    logToFile(message);

    try {
      dialog.showErrorBox('EActs Desktop Error', `${message}\n\nSee log file in: ${app.getPath('userData')}`);
    } catch {
      // If dialog fails (very early startup), ignore to avoid crashing.
    }

    throw error;
  }
}

app.whenReady().then(async () => {
  if (!isDev) {
    await startNextInProd();
  }

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
