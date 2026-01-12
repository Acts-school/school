import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
