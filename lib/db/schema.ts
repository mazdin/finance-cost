import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storeName: text("store_name").notNull(),
  item: text("item").notNull(),
  total: real("total").notNull(),
  date: text("date").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  source: text("source").default("manual"),
  billImageUrl: text("bill_image_url"),
  ocrRawText: text("ocr_raw_text"),
  createdAt: text("created_at").default("datetime('now')"),
});

export const seedCategories = [
  { name: "Makanan & Minuman", icon: "\uD83C\uDF54", color: "#FF6B6B" },
  { name: "Transport", icon: "\uD83D\uDE97", color: "#4ECDC4" },
  { name: "Belanja", icon: "\uD83D\uDECD\uFE0F", color: "#45B7D1" },
  { name: "Hiburan", icon: "\uD83C\uDFAC", color: "#96CEB4" },
  { name: "Kesehatan", icon: "\uD83D\uDC8A", color: "#FFEAA7" },
  { name: "Tagihan", icon: "\uD83D\uDCF1", color: "#DDA0DD" },
  { name: "Lainnya", icon: "\uD83D\uDCE6", color: "#B0C4DE" },
] as const;
