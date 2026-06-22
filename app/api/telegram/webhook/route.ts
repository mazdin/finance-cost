import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/turso";
import { transactions, categories, seedCategories } from "@/lib/db/schema";
import { sendMessage, formatRupiah, parseTelegramAmount, getFileUrl } from "@/lib/telegram";
import { getMonthlyReport } from "@/lib/reports";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Telegram webhook endpoint active" });
}

const HELP_TEXT = `Halo! Saya asisten pencatat keuangan kamu.

<b>Perintah:</b>
/catat [toko] [item] [total] - Catat cepat
/catat - Wizard step-by-step
/laporan - Laporan bulan ini
/laporan YYYY-MM - Laporan bulan tertentu
/total - Total hari ini
/minggu - Total 7 hari terakhir
/hapus [id] - Hapus transaksi
/start - Pesan ini

Atau kirim foto struk belanja untuk diproses!`;

function parseQuickCommand(text: string): { storeName: string; item: string; total: number } | null {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) return null;

  const totalStr = parts[parts.length - 1];
  const total = parseTelegramAmount(totalStr);
  if (total === null) return null;

  const storeName = parts[0].replace(/[^a-zA-Z0-9\s]/g, "");
  const item = parts.slice(1, -1).join(" ");
  return { storeName, item, total };
}

function parseOcrText(text: string): { storeName?: string; total?: number; date?: string; items?: string } {
  const lines = text.split("\n").filter(Boolean);
  const storeName = lines[0]?.trim();

  const totalMatch = text.match(/(?:total|jumlah|bayar|rp|idr)\s*:?\s*(?:rp\.?\s*)?([\d.,\s]+)/i);
  let total: number | undefined;
  if (totalMatch) {
    const cleaned = totalMatch[1].replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
    total = parseFloat(cleaned);
  }

  const dateMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  let date: string | undefined;
  if (dateMatch) {
    const [_, d, m, y] = dateMatch;
    const fullYear = y.length === 2 ? "20" + y : y;
    date = `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const items = lines.slice(1, -1).join(", ");

  return { storeName, total, date, items };
}

async function ensureCategoriesExist() {
  const existing = await db.select().from(categories);
  if (existing.length === 0) {
    for (const cat of seedCategories) {
      await db.insert(categories).values(cat);
    }
  }
}

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await request.json();
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text?.trim() || "";
    const photo = message.photo;

    await ensureCategoriesExist();

    if (photo) {
      const fileId = photo[photo.length - 1].file_id;
      const fileUrl = await getFileUrl(fileId);
      await sendMessage(chatId, `Terima kasih! Foto struk diterima. Sayangnya, OCR hanya berfungsi di browser. Silakan buka portal web untuk meng-upload dan memproses foto ini.\n\nLink: ${BASE_URL}/scan`);
      return NextResponse.json({ ok: true });
    }

    if (!text) return NextResponse.json({ ok: true });

    const args = text.split(" ");
    const command = args[0].toLowerCase();

    switch (command) {
      case "/start":
        await sendMessage(chatId, HELP_TEXT);
        break;

      case "/catat": {
        const rest = text.slice("/catat".length).trim();
        if (rest) {
          const parsed = parseQuickCommand(rest);
          if (!parsed) {
            await sendMessage(chatId, `Format: /catat [toko] [item] [total]\nContoh: /catat Kopi Janji Jiwa 25000`);
            break;
          }

          const today = new Date().toISOString().split("T")[0];
          const result = await db.insert(transactions).values({
            storeName: parsed.storeName,
            item: parsed.item,
            total: parsed.total,
            date: today,
            source: "telegram",
          }).returning();

          const cats = await db.select().from(categories);
          await sendMessage(chatId, `✅ Tersimpan!\n🏪 ${parsed.storeName}\n📦 ${parsed.item}\n💰 ${formatRupiah(parsed.total)}\n📅 ${today}\n\nKategori? Ketik nomor:\n${cats.map((c, i) => `${i + 1}. ${c.icon} ${c.name}`).join("\n")}\n\nAtau kirim /skip`);
          // In production, store pending category selection in session/DB
        } else {
          await sendMessage(chatId, `Mode wizard aktif. Ketik nama toko:`);
        }
        break;
      }

      case "/laporan": {
        const dateArg = args[1];
        let year = new Date().getFullYear();
        let month = new Date().getMonth() + 1;

        if (dateArg) {
          const parts = dateArg.split("-");
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
        }

        const report = await getMonthlyReport(year, month);

        if (report.total === 0) {
          await sendMessage(chatId, `📊 Laporan ${month}/${year}\n\nBelum ada transaksi bulan ini.`);
          break;
        }

        let msg = `<b>📊 Laporan ${month}/${year}</b>\n\n`;
        msg += `💰 Total: ${formatRupiah(report.total)}\n`;
        msg += `📊 Rata-rata/hari: ${formatRupiah(report.averagePerDay)}\n`;
        msg += `🔥 Tertinggi: ${formatRupiah(report.highest.amount)} — ${report.highest.storeName}\n\n`;
        msg += `<b>Per Kategori:</b>\n`;

        for (const cat of report.byCategory) {
          msg += `${cat.icon} ${cat.name}: ${formatRupiah(cat.total)} (${cat.count}x)\n`;
        }

        await sendMessage(chatId, msg);
        break;
      }

      case "/total": {
        const today = new Date().toISOString().split("T")[0];
        const todayTxns = await db
          .select()
          .from(transactions)
          .where(eq(transactions.date, today));

        const total = todayTxns.reduce((sum, t) => sum + t.total, 0);
        await sendMessage(chatId, `📅 Hari ini (${today}):\n💰 Total: ${formatRupiah(total)}\n📝 Transaksi: ${todayTxns.length}`);
        break;
      }

      case "/minggu": {
        const dates: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split("T")[0]);
        }

        let total = 0;
        let count = 0;
        for (const date of dates) {
          const txns = await db.select().from(transactions).where(eq(transactions.date, date));
          total += txns.reduce((s, t) => s + t.total, 0);
          count += txns.length;
        }

        await sendMessage(chatId, `📊 7 Hari Terakhir:\n💰 Total: ${formatRupiah(total)}\n📝 Transaksi: ${count}`);
        break;
      }

      case "/hapus": {
        const id = args[1];
        if (!id) {
          const last = await db
            .select()
            .from(transactions)
            .orderBy(desc(transactions.id))
            .limit(1);
          if (last.length === 0) {
            await sendMessage(chatId, "Belum ada transaksi.");
          } else {
            await db.delete(transactions).where(eq(transactions.id, last[0].id));
            await sendMessage(chatId, `🗑️ Transaksi terakhir dihapus: ${last[0].storeName} ${formatRupiah(last[0].total)}`);
          }
        } else {
          const txn = await db.select().from(transactions).where(eq(transactions.id, parseInt(id)));
          if (txn.length === 0) {
            await sendMessage(chatId, `Transaksi #${id} tidak ditemukan.`);
          } else {
            await db.delete(transactions).where(eq(transactions.id, parseInt(id)));
            await sendMessage(chatId, `🗑️ Transaksi #${id} dihapus: ${txn[0].storeName} ${formatRupiah(txn[0].total)}`);
          }
        }
        break;
      }

      case "/skip":
        await sendMessage(chatId, "Transaksi disimpan tanpa kategori.");
        break;

      default:
        if (/^\d+$/.test(command)) {
          const idx = parseInt(command);
          const cats = await db.select().from(categories);
          if (idx >= 1 && idx <= cats.length) {
            const cat = cats[idx - 1];
            const last = await db
              .select()
              .from(transactions)
              .orderBy(desc(transactions.id))
              .limit(1);
            if (last.length > 0) {
              await db.update(transactions).set({ categoryId: cat.id }).where(eq(transactions.id, last[0].id));
              await sendMessage(chatId, `✅ Kategori "${cat.icon} ${cat.name}" diterapkan!`);
            }
          } else {
            await sendMessage(chatId, "Nomor kategori tidak valid. Coba lagi atau kirim /skip.");
          }
        } else {
          await sendMessage(chatId, `Perintah tidak dikenal. Ketik /start untuk bantuan.`);
        }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
