import { NextRequest, NextResponse } from "next/server";

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
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;
    const { getCurrentSchoolContext, ensurePermission } = await import('@/lib/authz');

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

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';