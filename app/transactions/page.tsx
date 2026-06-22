"use client";

import { useState, useEffect, useCallback } from "react";
import TransactionCard from "@/components/TransactionCard";
import CategoryBadge from "@/components/CategoryBadge";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnRes, catRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/categories"),
      ]);
      const txnData = await txnRes.json();
      const catData = await catRes.json();
      setTransactions(txnData.data);
      setCategories(catData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catMap = new Map(categories.map((c: any) => [c.id, c]));

  let filtered = transactions.filter((t: any) => {
    const matchSearch = !search ||
      t.storeName.toLowerCase().includes(search.toLowerCase()) ||
      t.item.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || t.categoryId === filterCategory;
    return matchSearch && matchCategory;
  });

  if (sortOrder === "desc") {
    filtered = [...filtered].sort((a: any, b: any) => b.date.localeCompare(a.date) || b.id - a.id);
  } else {
    filtered = [...filtered].sort((a: any, b: any) => a.date.localeCompare(b.date) || a.id - b.id);
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Riwayat Transaksi</h1>
        <p className="page-subtitle">Semua pengeluaran dalam satu tempat</p>
      </div>

      <div className="search-input">
        <input
          className="form-input"
          type="text"
          placeholder="Cari toko atau item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <select className="form-input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}>
          <option value="desc">Terbaru</option>
          <option value="asc">Terlama</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <CategoryBadge
          name="Semua"
          icon="📋"
          color="#9090a8"
          selected={filterCategory === null}
          onClick={() => setFilterCategory(null)}
        />
        {categories.map((c: any) => (
          <CategoryBadge
            key={c.id}
            name={c.name}
            icon={c.icon}
            color={c.color}
            selected={filterCategory === c.id}
            onClick={() => setFilterCategory(filterCategory === c.id ? null : c.id)}
          />
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 40 }}>Memuat...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 40 }}>
          Tidak ada transaksi yang ditemukan.
        </p>
      ) : (
        <div className="transaction-list">
          {filtered.map((t: any) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              category={t.categoryId ? catMap.get(t.categoryId) : undefined}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
