import { NextResponse } from "next/server";
import fs from "fs";

export async function POST() {
  fs.writeFileSync("/tmp/upload", "data");
  return NextResponse.json({ ok: true });
}
