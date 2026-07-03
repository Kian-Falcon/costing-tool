import { NextResponse } from "next/server";
import { z } from "zod";
import { authJsonError, getCurrentUser, hashPassword, requireRole, setSessionCookie } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  organizationName: z.string().min(1).default("Kian Falcon"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).optional()
});

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const userCount = await prisma.user.count();
    const currentUser = await getCurrentUser();

    if (userCount > 0) {
      if (!currentUser) return NextResponse.json({ error: "Only an admin can add users after first setup." }, { status: 403 });
      requireRole(currentUser, "ADMIN");
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "User already exists." }, { status: 409 });

    const organization =
      currentUser?.organization ??
      (await prisma.organization.upsert({
        where: { id: await organizationIdForName(body.organizationName) },
        create: { name: body.organizationName },
        update: { name: body.organizationName }
      }));

    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash: hashPassword(body.password),
        role: userCount === 0 ? "OWNER" : body.role ?? "MEMBER"
      },
      select: { id: true, email: true, name: true, role: true, organization: { select: { id: true, name: true } } }
    });

    const response = NextResponse.json({ user });
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    return authJsonError(error);
  }
}

async function organizationIdForName(name: string): Promise<string> {
  const existing = await prisma.organization.findFirst({ where: { name }, orderBy: { createdAt: "asc" }, select: { id: true } });
  return existing?.id ?? `org_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "workspace"}`;
}
