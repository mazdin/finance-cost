"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BillScanner from "@/components/BillScanner";
import CategoryBadge from "@/components/CategoryBadge";

interface OcrResult {
  storeName?: string;
  total?: number;
  date?: string;
  items?: string;
  rawText: string;
}

export default function ScanPage() {
  const router = useRouter();
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    item: "",
    total: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
  });

  const handleOcrResult = async (result: OcrResult) => {
    setOcrResult(result);

    const catRes = await fetch("/api/categories");
    const catData = await catRes.json();
    setCategories(catData.data);

    setForm({
      storeName: result.storeName || "",
      item: result.items || "",
      total: result.total ? result.total.toString() : "",
      date: result.date || new Date().toISOString().split("T")[0],
      categoryId: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName || !form.total) return;

    setSubmitting(true);
    try {
      const totalNum = parseInt(form.total.replace(/[^\d]/g, ""));
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          item: form.item || form.storeName,
          total: totalNum,
          date: form.date,
          categoryId: form.categoryId ? parseInt(form.categoryId) : null,
          source: "ocr",
          ocrRawText: ocrResult?.rawText || null,
        }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">Scan Bill</h1>
        <p className="page-subtitle">
          Upload foto struk belanja — OCR diproses di browser
        </p>
      </div>

      <BillScanner onResult={handleOcrResult} />

      {ocrResult && (
        <div className="scan-result">
          <h3>Hasil Scan — Review & Edit</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nama Toko</label>
              <input
                className="form-input"
                type="text"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Item</label>
              <input
                className="form-input"
                type="text"
                value={form.item}
                onChange={(e) => setForm({ ...form, item: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total (Rp)</label>
              <input
                className="form-input"
                type="text"
                value={form.total}
                onChange={(e) =>
                  setForm({
                    ...form,
                    total: e.target.value.replace(/[^\d]/g, ""),
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input
                className="form-input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kategori</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {categories.map((c: any) => (
                  <CategoryBadge
                    key={c.id}
                    name={c.name}
                    icon={c.icon}
                    color={c.color}
                    selected={form.categoryId === String(c.id)}
                    onClick={() =>
                      setForm({
                        ...form,
                        categoryId:
                          form.categoryId === String(c.id) ? "" : String(c.id),
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Menyimpan..." : "💾 Simpan Transaksi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
