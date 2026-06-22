"use client";

import { formatRupiah } from "@/lib/telegram";

interface SummaryStatsProps {
  total: number;
  averagePerDay: number;
  highest: { amount: number; storeName: string };
  count: number;
}

export default function SummaryStats({ total, averagePerDay, highest, count }: SummaryStatsProps) {
  const stats = [
    { label: "Total Bulan Ini", value: formatRupiah(total), icon: "💰" },
    { label: "Rata-rata / Hari", value: formatRupiah(averagePerDay), icon: "📊" },
    { label: "Pengeluaran Tertinggi", value: formatRupiah(highest.amount), sub: highest.storeName, icon: "🔥" },
    { label: "Jumlah Transaksi", value: String(count), icon: "📝" },
  ];

  return (
    <div className="summary-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="stat-card glass">
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-info">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
            {stat.sub && <div className="stat-sub">{stat.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
