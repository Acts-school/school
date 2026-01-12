import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { ensurePermission } from "@/lib/authz";

type ImageUploadSuccessResponse = {
  imageUrl: string;
};

type ImageUploadErrorResponse = {
  error: string;
};

type ImageUploadResponse = ImageUploadSuccessResponse | ImageUploadErrorResponse;

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ImageUploadResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    const rawEntityType = formData.get("entityType");
    const rawEntityId = formData.get("entityId");

    const entityType = typeof rawEntityType === "string" ? rawEntityType : null;
    const entityId = typeof rawEntityId === "string" ? rawEntityId : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const created = await prisma.imageAsset.create({
      data: {
        mimeType: file.type,
        data: buffer,
      },
    });

    const imageUrl = `/api/images/${created.id}`;

    if (entityType && entityId) {
      if (entityType === "teacher") {
        await ensurePermission("teachers.write");
        await prisma.teacher.update({
          where: { id: entityId },
          data: { img: imageUrl },
        });
      } else if (entityType === "student") {
        await ensurePermission("students.write");
        await prisma.student.update({
          where: { id: entityId },
          data: { img: imageUrl },
        });
      }
    }

    return NextResponse.json({ imageUrl }, { status: 201 });
  } catch (error) {
    console.error("Image upload failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
