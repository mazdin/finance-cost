import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { transactions, categories } from "@/lib/db/schema";
import { eq, desc, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const categoryId = searchParams.get("categoryId");

    let conditions = sql`1=1`;
    if (month && year) {
      const start = `${year}-${String(Number(month)).padStart(2, "0")}-01`;
      const end = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];
      conditions = sql`${gte(transactions.date, start)} AND ${lte(transactions.date, end)}`;
    }
    if (categoryId) {
      conditions = sql`${conditions} AND ${eq(transactions.categoryId, Number(categoryId))}`;
    }

    const data = await db
      .select()
      .from(transactions)
      .where(conditions)
      .orderBy(desc(transactions.date));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, item, total, date, categoryId, source, billImageUrl, ocrRawText } = body;

    const result = await db.insert(transactions).values({
      storeName: storeName || "",
      item: item || "",
      total: Number(total) || 0,
      date: date || new Date().toISOString().split("T")[0],
      categoryId: categoryId ? Number(categoryId) : null,
      source: source || "manual",
      billImageUrl: billImageUrl || null,
      ocrRawText: ocrRawText || null,
    }).returning();

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...fields } = body;

    const result = await db
      .update(transactions)
      .set(fields)
      .where(eq(transactions.id, id))
      .returning();

    return NextResponse.json({ data: result[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db.delete(transactions).where(eq(transactions.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
