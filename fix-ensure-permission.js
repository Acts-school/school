const fs = require('fs');
const path = require('path');

// List of files that need ensurePermission import
const filesToFix = [
  'src/app/api/result/route.ts',
  'src/app/api/parent/route.ts',
  'src/app/api/messages/route.ts',
  'src/app/api/messages/recipients/route.ts',
  'src/app/api/lesson/route.ts',
  'src/app/api/learning-observations/route.ts',
  'src/app/api/images/upload/route.ts',
  'src/app/api/event/route.ts',
  'src/app/api/cbc-task-marks/route.ts'
];

function fixEnsurePermission(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Fix the import line
  content = content.replace(
    /const \{ getCurrentSchoolContext \} = await import\('@\/lib\/authz'\);/g,
    "const { getCurrentSchoolContext, ensurePermission } = await import('@/lib/authz');"
  );
  
  // Write the file back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Fix all files
filesToFix.forEach(fixEnsurePermission);
console.log('Done!');
