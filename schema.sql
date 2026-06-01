import { NextResponse } from "next/server";

export function ok(data = {}) {
  return NextResponse.json(data);
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getYearTicketPrefix() {
  return `HOS-${new Date().getFullYear()}-`;
}
