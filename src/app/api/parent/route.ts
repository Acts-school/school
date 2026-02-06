import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    // Import inside function to prevent build-time execution
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext, ensurePermission } = await import('@/lib/authz');

  try {
    await ensurePermission("parents.write");

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.parent.delete({
      where: { id: idParam },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete parent:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';