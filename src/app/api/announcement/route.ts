import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { ensurePermission } from "@/lib/authz";

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    await ensurePermission("announcements.write");

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const id = Number.parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
