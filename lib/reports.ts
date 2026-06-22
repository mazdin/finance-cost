import { db } from "./turso";
import { transactions, categories } from "./db/schema";
import { eq, gte, lte, sql } from "drizzle-orm";

export interface MonthlyReport {
  total: number;
  averagePerDay: number;
  highest: { amount: number; storeName: string; item: string; date: string };
  byCategory: { name: string; icon: string; color: string; total: number; count: number }[];
  dailyTotals: { date: string; total: number }[];
}

export async function getMonthlyReport(
  year: number,
  month: number,
  categoryId?: number
): Promise<MonthlyReport> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const allCats = await db.select().from(categories);
  const catMap = new Map(allCats.map((c) => [c.id, c]));

  const conditions = [
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
  ];
  if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));

  const txns = await db
    .select()
    .from(transactions)
    .where(sql.join(conditions, sql` AND `));

  if (txns.length === 0) {
    return {
      total: 0,
      averagePerDay: 0,
      highest: { amount: 0, storeName: "-", item: "-", date: "-" },
      byCategory: [],
      dailyTotals: [],
    };
  }

  const total = txns.reduce((sum, t) => sum + t.total, 0);
  const daysInMonth = new Date(year, month, 0).getDate();
  const averagePerDay = total / daysInMonth;

  const highest = txns.reduce((max, t) => (t.total > max.amount ? { amount: t.total, storeName: t.storeName, item: t.item, date: t.date } : max), { amount: 0, storeName: "", item: "", date: "" });

  const byCategoryMap = new Map<string, { name: string; icon: string; color: string; total: number; count: number }>();
  for (const t of txns) {
    const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
    const key = cat?.name ?? "Lainnya";
    const existing = byCategoryMap.get(key) ?? {
      name: key,
      icon: cat?.icon ?? "\uD83D\uDCE6",
      color: cat?.color ?? "#B0C4DE",
      total: 0,
      count: 0,
    };
    existing.total += t.total;
    existing.count += 1;
    byCategoryMap.set(key, existing);
  }

  const dailyMap = new Map<string, number>();
  for (const t of txns) {
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + t.total);
  }
  const dailyTotals = Array.from(dailyMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    averagePerDay,
    highest,
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.total - a.total),
    dailyTotals,
  };
}
