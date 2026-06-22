import { NextRequest, NextResponse } from "next/server";
import { getMonthlyReport } from "@/lib/reports";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const categoryId = searchParams.get("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;

    const report = await getMonthlyReport(year, month, categoryId);
    return NextResponse.json({ data: report });
  } catch (error) {
    return NextResponse.json({
      data: {
        total: 0,
        averagePerDay: 0,
        highest: { amount: 0, storeName: "-", item: "-", date: "-" },
        byCategory: [],
        dailyTotals: [],
      },
    });
  }
}
