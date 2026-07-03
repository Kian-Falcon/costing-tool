import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie, verifyPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const body = loginSchema.parse(await request.json());
  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    select: { id: true, email: true, name: true, passwordHash: true, role: true, organization: { select: { id: true, name: true } } }
  });

  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, organization: user.organization } });
  setSessionCookie(response, user.id);
  return response;
}
