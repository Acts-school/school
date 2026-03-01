const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const prismaClientPath = path.join(__dirname, 'prisma', 'client');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            if (!p.includes('node_modules') && !p.includes('.next')) {
                walk(p, callback);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            callback(p);
        }
    });
}

let modified = 0;

walk(srcDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('@prisma/client')) {
        // Calculate relative path from this file to the prisma/client folder
        const relativePrismaPath = path.relative(path.dirname(filePath), prismaClientPath).replace(/\\/g, '/');
        const newImportStr = relativePrismaPath.startsWith('.') ? relativePrismaPath : `./${relativePrismaPath}`;

        // Replace the import string
        content = content.replace(/['"]@prisma\/client['"]/g, `"${newImportStr}"`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
        modified++;
    }
});

// Also fix some tests
const testsDir = path.join(__dirname, '__tests__');
if (fs.existsSync(testsDir)) {
    walk(testsDir, (filePath) => {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('@prisma/client')) {
            const relativePrismaPath = path.relative(path.dirname(filePath), prismaClientPath).replace(/\\/g, '/');
            const newImportStr = relativePrismaPath.startsWith('.') ? relativePrismaPath : `./${relativePrismaPath}`;
            content = content.replace(/['"]@prisma\/client['"]/g, `"${newImportStr}"`);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated test: ${filePath}`);
            modified++;
        }
    });
}

console.log(`Fixed ${modified} files!`);
