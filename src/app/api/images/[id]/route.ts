import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type RouteParams = {
  id: string | string[] | undefined;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

const toSingleValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const resolvedParams = await context.params;

    const id = toSingleValue(resolvedParams.id);

    if (!id) {
      return NextResponse.json({ error: "Missing image id" }, { status: 400 });
    }

    const image = await prisma.imageAsset.findUnique({
      where: { id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const body = new Uint8Array(image.data);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to fetch image asset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
