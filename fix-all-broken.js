const fs = require('fs');
const path = require('path');

// List of all remaining broken routes
const brokenRoutes = [
  'src/app/api/student-fees/my/route.ts',
  'src/app/api/student-fees/my/summary/route.ts',
  'src/app/api/student-fees/route.ts',
  'src/app/api/sync/assignments/route.ts',
  'src/app/api/sync/attendance/route.ts'
];

function fixBrokenRoute(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Fix the broken function signature pattern
  // Pattern 1: Multi-line return type with imports inside
  content = content.replace(
    /: Promise<NextResponse<([^|>]+) \|\s*\{\s*\/\/ Import inside function to prevent build-time execution\s*const ([^}]+)\s*error: string\s*\}\s*>>/gs,
    ': Promise<NextResponse<$1 | { error: string }>>'
  );
  
  // Pattern 2: Similar pattern with different structure
  content = content.replace(
    /: Promise<NextResponse<([^|>]+) \|\s*\{\s*\/\/ Import inside function to prevent build-time execution\s*const prisma = \([^)]+\)\.default;\s*const ([^}]+)\s*error: string\s*\}\s*>>/gs,
    ': Promise<NextResponse<$1 | { error: string }>>'
  );
  
  // Pattern 3: Single line with prisma import
  content = content.replace(
    /: Promise<NextResponse<([^|>]+) \|\s*\{\s*\/\/ Import inside function to prevent build-time execution\s*const prisma = \([^}]+\)\.default;\s*error: string\s*\}\s*>>/gs,
    ': Promise<NextResponse<$1 | { error: string }>>'
  );
  
  // Now add the imports at the beginning of each function
  const functionPattern = /(export async function \w+\([^)]*\): Promise<NextResponse<[^{]+>\s*)(\{[\s\S]*?)(\s*try\s*{)/g;
  
  content = content.replace(functionPattern, (match, prefix, middle, tryStart) => {
    // Check if imports are already present
    if (middle.includes('await import')) {
      return match;
    }
    
    // Add imports before try
    return prefix + middle + '\n  // Import inside function to prevent build-time execution\n' +
           '  const { getServerSession } = await import(\'next-auth\');\n' +
           '  const authOptions = (await import(\'@/pages/api/auth/[...nextauth]\')).authOptions;\n' +
           '  const prisma = (await import(\'@/lib/prisma\')).default;\n' +
           '  const { getCurrentSchoolContext } = await import(\'@/lib/authz\');' + tryStart;
  });
  
  // Write the file back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed for ${filePath}`);
  }
}

// Fix all broken routes
brokenRoutes.forEach(fixBrokenRoute);
console.log('Done!');
