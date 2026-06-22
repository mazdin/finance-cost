"use client";

import { useState, useEffect, useCallback } from "react";
import SummaryStats from "@/components/SummaryStats";
import MonthlyChart from "@/components/MonthlyChart";
import TransactionCard from "@/components/TransactionCard";
import type { MonthlyReport } from "@/lib/reports";

export default function DashboardPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, txnRes, catRes] = await Promise.all([
        fetch(`/api/reports?year=${year}&month=${month}`),
        fetch(`/api/transactions?year=${year}&month=${month}${filterCategory ? `&categoryId=${filterCategory}` : ""}`),
        fetch("/api/categories"),
      ]);

      const reportData = await reportRes.json();
      const txnData = await txnRes.json();
      const catData = await catRes.json();

      setReport(reportData.data || null);
      setTransactions(Array.isArray(txnData.data) ? txnData.data : []);
      setCategories(Array.isArray(catData.data) ? catData.data : []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, filterCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const catMap = new Map((categories || []).map((c: any) => [c.id, c]));

  const filteredTxns = transactions.filter((t: any) =>
    !search || t.storeName.toLowerCase().includes(search.toLowerCase()) ||
    t.item.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = ["Toko", "Item", "Total", "Tanggal", "Kategori", "Sumber"];
    const rows = transactions.map((t: any) => {
      const cat = t.categoryId ? catMap.get(t.categoryId) : null;
      return [t.storeName, t.item, t.total, t.date, cat?.name || "-", t.source || "manual"].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Laporan ${month}/${year}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Total: Rp ${report?.total.toLocaleString("id-ID") || 0}`, 14, 36);
    doc.text(`Rata-rata/hari: Rp ${report?.averagePerDay.toLocaleString("id-ID") || 0}`, 14, 44);

    let y = 56;
    doc.setFontSize(14);
    doc.text("Transaksi:", 14, y);
    y += 10;
    doc.setFontSize(10);
    for (const t of transactions.slice(0, 50)) {
      doc.text(`${t.date} - ${t.storeName} - Rp ${t.total.toLocaleString("id-ID")}`, 14, y);
      y += 7;
      if (y > 280) break;
    }
    doc.save(`laporan-${year}-${month}.pdf`);
  };

  if (loading) {
    return <div className="page-header"><p className="page-subtitle">Memuat data...</p></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Ringkasan pengeluaran bulanan</p>
      </div>

      <div className="filter-bar">
        <select className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("id", { month: "long" })}
            </option>
          ))}
        </select>
        <select className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="form-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="export-bar">
        <button className="export-btn" onClick={handleExportCSV}>Export CSV</button>
        <button className="export-btn" onClick={handleExportPDF}>Export PDF</button>
      </div>

      {report && (
        <SummaryStats
          total={report.total}
          averagePerDay={report.averagePerDay}
          highest={report.highest}
          count={transactions.length}
        />
      )}

      {report && (
        <MonthlyChart
          dailyTotals={report.dailyTotals}
          byCategory={report.byCategory}
        />
      )}

      <div className="search-input">
        <input
          className="form-input"
          type="text"
          placeholder="Cari transaksi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="transaction-list">
        {filteredTxns.length === 0 && (
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: 40 }}>
            Belum ada transaksi. Mulai catat pengeluaran!
          </p>
        )}
        {filteredTxns.map((t: any) => (
          <TransactionCard
            key={t.id}
            transaction={t}
            category={t.categoryId ? catMap.get(t.categoryId) : undefined}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
