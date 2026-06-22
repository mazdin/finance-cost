"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import CategoryBadge from "@/components/CategoryBadge";

export default function AddPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    storeName: "",
    item: "",
    total: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data));
  }, []);

  const formatRupiahInput = (value: string): string => {
    const num = value.replace(/[^\d]/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.storeName || !form.total) return;

    setSubmitting(true);
    try {
      const totalNum = parseInt(form.total.replace(/\./g, ""));
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: form.storeName,
          item: form.item || form.storeName,
          total: totalNum,
          date: form.date,
          categoryId: form.categoryId ? parseInt(form.categoryId) : null,
          source: "manual",
        }),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }, [form, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">Tambah Transaksi</h1>
        <p className="page-subtitle">Catat pengeluaran baru</p>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="form-group">
          <label className="form-label">Nama Toko *</label>
          <input
            className="form-input"
            type="text"
            placeholder="Contoh: Kopi Janji Jiwa"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Item</label>
          <input
            className="form-input"
            type="text"
            placeholder="Contoh: Kopi Susu Gula Aren"
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Total (Rp) *</label>
          <input
            className="form-input"
            type="text"
            placeholder="25.000"
            value={form.total}
            onChange={(e) => setForm({ ...form, total: formatRupiahInput(e.target.value) })}
            required
          />
          <p className="rupiah-hint">Input angka saja, format Rupiah otomatis</p>
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
                    categoryId: form.categoryId === String(c.id) ? "" : String(c.id),
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
  );
}
