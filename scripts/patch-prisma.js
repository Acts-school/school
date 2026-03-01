const fs = require('fs');
const path = require('path');

const PRISMA_HIDDEN_DIR = path.join(__dirname, '..', 'node_modules', '.prisma');
const PRISMA_NEW_DIR = path.join(__dirname, '..', 'node_modules', 'prisma-generated');
const CLIENT_INDEX = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.js');
const CLIENT_DEFAULT = path.join(__dirname, '..', 'node_modules', '@prisma', 'client', 'default.js');

try {
    // 1. Rename .prisma to prisma-generated
    if (fs.existsSync(PRISMA_HIDDEN_DIR)) {
        if (fs.existsSync(PRISMA_NEW_DIR)) {
            console.log('Old prisma-generated directory exists, removing...');
            fs.rmSync(PRISMA_NEW_DIR, { recursive: true, force: true });
        }
        console.log('Renaming .prisma to prisma-generated...');
        fs.renameSync(PRISMA_HIDDEN_DIR, PRISMA_NEW_DIR);
    }

    // 2. Patch @prisma/client/index.js
    if (fs.existsSync(CLIENT_INDEX)) {
        let content = fs.readFileSync(CLIENT_INDEX, 'utf8');
        content = content.replace(/\.prisma\/client\/default/g, 'prisma-generated/client/default');
        fs.writeFileSync(CLIENT_INDEX, content, 'utf8');
        console.log('Patched @prisma/client/index.js');
    }

    // 3. Patch @prisma/client/default.js
    if (fs.existsSync(CLIENT_DEFAULT)) {
        let content = fs.readFileSync(CLIENT_DEFAULT, 'utf8');
        content = content.replace(/\.prisma\/client\/default/g, 'prisma-generated/client/default');
        fs.writeFileSync(CLIENT_DEFAULT, content, 'utf8');
        console.log('Patched @prisma/client/default.js');
    }

    console.log('Prisma correctly patched for electron-builder packing.');
} catch (error) {
    console.error('Failed to patch Prisma:', error);
    process.exit(1);
}
