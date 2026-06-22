"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DailyTotal {
  date: string;
  total: number;
}

interface CategoryTotal {
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
}

interface MonthlyChartProps {
  dailyTotals: DailyTotal[];
  byCategory: CategoryTotal[];
}

export default function MonthlyChart({ dailyTotals, byCategory }: MonthlyChartProps) {
  const barData = dailyTotals.map((d) => ({
    date: d.date.slice(8),
    total: d.total,
  }));

  const hasBarData = barData.length > 0;

  const chartData = byCategory.map((c) => ({
    name: `${c.icon} ${c.name}`,
    value: c.total,
    color: c.color,
  }));

  const hasPieData = chartData.length > 0;
  const pieSource = hasPieData ? chartData : [{ name: "Belum ada data", value: 1, color: "#eee" }];

  return (
    <div className="charts-grid">
      <div className="chart-card glass">
        <h3 className="chart-title">Pengeluaran per Hari</h3>
        {hasBarData ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Total"]} />
              <Bar dataKey="total" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
            Belum ada data
          </div>
        )}
      </div>

      <div className="chart-card glass">
        <h3 className="chart-title">Distribusi Kategori</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieSource}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={hasPieData ? ({ name }) => name : undefined}
            >
              {pieSource.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Total"]} />
            {hasPieData && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
