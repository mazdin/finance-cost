import { NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { categories } from "@/lib/db/schema";

export async function GET() {
  try {
    const data = await db.select().from(categories);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
