import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
    // Import inside function to prevent build-time execution
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext, ensurePermission } = await import('@/lib/authz');

  try {
    await ensurePermission("assignments.write");

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const id = Number.parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';