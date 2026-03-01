const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_SQLITE_URL = 'file:./eacts-desktop.db';

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${String(code)}`));
      }
    });
  });
}

async function ensureSqliteDatabase(appPath) {
  const env = { ...process.env };

  if (!env.DATABASE_PROVIDER) {
    env.DATABASE_PROVIDER = 'sqlite';
  }

  if (!env.DATABASE_URL) {
    env.DATABASE_URL = DEFAULT_SQLITE_URL;
  }

  const dbUrl = env.DATABASE_URL;
  const isFileUrl = dbUrl.startsWith('file:');

  if (!isFileUrl) {
    return env;
  }

  const relativePath = dbUrl.replace('file:', '');
  const dbPath = path.resolve(appPath, relativePath);
  const dbExists = fs.existsSync(dbPath);

  if (!dbExists) {
    await runCommand(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'migrate', 'deploy'],
      {
        cwd: appPath,
        env,
        stdio: 'inherit',
      },
    );

    if (process.env.EACTS_DESKTOP_SEED === '1') {
      await runCommand(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['prisma', 'db', 'seed'],
        {
          cwd: appPath,
          env,
          stdio: 'inherit',
        },
      );
    }
  }

  return env;
}

module.exports = {
  ensureSqliteDatabase,
};
