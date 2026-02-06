import { NextRequest, NextResponse } from "next/server";

interface AuditLogRow {
  id: number;
  actorUserId: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  reason?: string | null;
  createdAt: string | Date;
}

type AuditFindManyArgs = {
  where?: { entity?: string; entityId?: string };
  orderBy?: { createdAt: "desc" | "asc" };
  take?: number;
  skip?: number;
  select?: {
    id: true; actorUserId: true; entity: true; entityId: true; oldValue: true; newValue: true; reason: true; createdAt: true;
  };
};

type PrismaFacade = {
  auditLog: {
    findMany: (args: AuditFindManyArgs) => Promise<AuditLogRow[]>;
    count: (args: { where?: AuditFindManyArgs["where"] }) => Promise<number>;
  };
};

const db = prisma as unknown as PrismaFacade;

export async function GET(req: NextRequest) {
    // Import inside function to prevent build-time execution
    const { getServerSession } = await import('next-auth');
    const authOptions = (await import('@/pages/api/auth/[...nextauth]')).authOptions;
    const prisma = (await import('@/lib/prisma')).default;

  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "accountant"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get("entity") ?? undefined;
  const entityId = searchParams.get("entityId") ?? undefined;
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10;
  const offset = (page - 1) * limit;

  const where: NonNullable<AuditFindManyArgs["where"]> = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: { id: true, actorUserId: true, entity: true, entityId: true, oldValue: true, newValue: true, reason: true, createdAt: true },
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';