import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "lotus_helpdesk_session";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export function signSession(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      userId: user.user_id,
      role: user.role,
      departmentId: user.department_id,
      departmentName: user.department_name || null,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

export function setSessionCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireRole(user, allowedRoles = []) {
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
  return null;
}
