const fs = require('fs');
const path = require('path');

// List of broken routes that need fixing
const brokenRoutes = [
  'src/app/api/mpesa/c2b/confirm/route.ts',
  'src/app/api/mpesa/review/route.ts',
  'src/app/api/payments/route.ts',
  'src/app/api/student-fees/by-student/route.ts',
  'src/app/api/student-fees/generate/route.ts'
];

function fixBrokenRoute(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Fix broken function signatures
  content = content.replace(
    /export async function \w+\([^)]*\): Promise<NextResponse<{\s*\/\/ Import inside function to prevent build-time execution\s*const ([^}]+)}\s*([^>]+)>>/g,
    'export async function $1(req: NextRequest): Promise<NextResponse<$2>> {\n  // Import inside function to prevent build-time execution\n  const $3'
  );
  
  // Fix specific patterns
  content = content.replace(
    /export async function POST\(req: NextRequest\): Promise<NextResponse<{\s*\/\/ Import inside function to prevent build-time execution\s*const prisma = \(await import\('@\/lib\/prisma'\)\)\.default;\s*(ResultCode: string; ResultDesc: string)}>>/g,
    'export async function POST(req: NextRequest): Promise<NextResponse<{ ResultCode: string; ResultDesc: string }>> {\n  // Import inside function to prevent build-time execution\n  const prisma = (await import("@/lib/prisma")).default;'
  );
  
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
