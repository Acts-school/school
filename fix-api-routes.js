const fs = require('fs');
const path = require('path');

// List of all API routes that need fixing
const routes = [
  'src/app/api/teachers/route.ts',
  'src/app/api/teacher-lessons/route.ts',
  'src/app/api/teacher-assignments/route.ts',
  'src/app/api/teacher/form-data/route.ts',
  'src/app/api/sync/results/route.ts',
  'src/app/api/sync/changes/route.ts',
  'src/app/api/sync/bootstrap/route.ts',
  'src/app/api/sync/attendance/route.ts',
  'src/app/api/sync/assignments/route.ts',
  'src/app/api/subjects/route.ts',
  'src/app/api/subject/form-data/route.ts',
  'src/app/api/students/route.ts',
  'src/app/api/student-fees/route.ts',
  'src/app/api/student-fees/my/summary/route.ts',
  'src/app/api/student-fees/my/route.ts',
  'src/app/api/student-fees/generate/route.ts',
  'src/app/api/student-fees/by-student/route.ts',
  'src/app/api/student/form-data/route.ts',
  'src/app/api/results/route.ts',
  'src/app/api/result/route.ts',
  'src/app/api/result/form-data/route.ts',
  'src/app/api/payments/route.ts',
  'src/app/api/parents/route.ts',
  'src/app/api/parent/route.ts',
  'src/app/api/parent/form-data/route.ts',
  'src/app/api/mpesa/review/route.ts',
  'src/app/api/mpesa/initiate/route.ts',
  'src/app/api/mpesa/callback/route.ts',
  'src/app/api/mpesa/c2b/confirm/route.ts',
  'src/app/api/lessons/route.ts',
  'src/app/api/messages/route.ts',
  'src/app/api/messages/recipients/route.ts',
  'src/app/api/lesson/route.ts',
  'src/app/api/lesson/form-data/route.ts',
  'src/app/api/learning-observations/route.ts',
  'src/app/api/fees/route.ts',
  'src/app/api/images/[id]/route.ts',
  'src/app/api/fees/form-data/route.ts',
  'src/app/api/images/upload/route.ts',
  'src/app/api/fee-categories/route.ts',
  'src/app/api/fee-structures/route.ts',
  'src/app/api/fee-structures/[id]/route.ts',
  'src/app/api/fee-structures/preview/route.ts',
  'src/app/api/fee-structures/apply/route.ts',
  'src/app/api/exams/route.ts',
  'src/app/api/events/route.ts',
  'src/app/api/exam/form-data/route.ts',
  'src/app/api/event/route.ts',
  'src/app/api/current-school/route.ts',
  'src/app/api/event/form-data/route.ts',
  'src/app/api/classes/route.ts',
  'src/app/api/cbc-task-marks/route.ts',
  'src/app/api/class/form-data/route.ts',
  'src/app/api/cbc-slos/route.ts',
  'src/app/api/cbc-rubrics/route.ts',
  'src/app/api/bulk-attendance/route.ts',
  'src/app/api/audit-logs/route.ts',
  'src/app/api/attendances/route.ts',
  'src/app/api/attendance/route.ts',
  'src/app/api/assignments/route.ts',
  'src/app/api/assignment/route.ts',
  'src/app/api/attendance/form-data/route.ts',
  'src/app/api/assignment/form-data/route.ts',
  'src/app/api/announcements/route.ts',
  'src/app/api/announcement/route.ts'
];

function fixRoute(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Pattern to match imports that need to be moved
  const importPattern = /^import\s+(?:(?:{[^}]*}|\w+)\s+from\s+)?['"]((?:next-auth|@\/lib\/prisma|@\/pages\/api\/auth\/\[\.\.\.nextauth\]|@\/lib\/authz))['"];?\s*$/gm;
  
  // Collect imports to move
  const importsToMove = [];
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    importsToMove.push(match[0]);
  }
  
  if (importsToMove.length === 0) {
    console.log(`No imports to move in ${filePath}`);
    return;
  }
  
  // Remove the imports from the top
  importsToMove.forEach(imp => {
    content = content.replace(imp, '');
  });
  
  // Find the first export function and add imports inside
  const exportFunctionMatch = content.match(/export\s+(?:async\s+function\s+(\w+)|const\s+(\w+)\s*=\s*async)/);
  if (!exportFunctionMatch) {
    console.log(`No export function found in ${filePath}`);
    return;
  }
  
  const functionName = exportFunctionMatch[1] || exportFunctionMatch[2];
  const functionStart = content.indexOf(exportFunctionMatch[0]);
  const functionBodyStart = content.indexOf('{', functionStart) + 1;
  
  // Build the dynamic imports
  const dynamicImports = [];
  if (importsToMove.some(imp => imp.includes('next-auth'))) {
    dynamicImports.push("    const { getServerSession } = await import('next-auth');");
  }
  if (importsToMove.some(imp => imp.includes('@/pages/api/auth/[...nextauth]'))) {
    dynamicImports.push("    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;");
  }
  if (importsToMove.some(imp => imp.includes('@/lib/prisma'))) {
    dynamicImports.push("    const prisma = (await import('@/lib/prisma')).default;");
  }
  if (importsToMove.some(imp => imp.includes('@/lib/authz'))) {
    dynamicImports.push("    const { getCurrentSchoolContext } = await import('@/lib/authz');");
  }
  
  // Insert the dynamic imports at the beginning of the function
  const beforeFunction = content.substring(0, functionBodyStart);
  const afterFunction = content.substring(functionBodyStart);
  
  content = beforeFunction + '\n    // Import inside function to prevent build-time execution\n' + 
            dynamicImports.join('\n') + '\n' + afterFunction;
  
  // Add dynamic export at the end if not already present
  if (!content.includes('export const dynamic')) {
    content += '\n\n// Force dynamic rendering to prevent build-time execution\nexport const dynamic = \'force-dynamic\';';
  }
  
  // Clean up extra newlines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Write the file back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Fix all routes
routes.forEach(fixRoute);
console.log('Done!');
