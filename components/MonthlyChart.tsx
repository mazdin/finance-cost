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

  const pieData = byCategory.map((c) => ({
    name: `${c.icon} ${c.name}`,
    value: c.total,
    color: c.color,
  }));

  return (
    <div className="charts-grid">
      <div className="chart-card glass">
        <h3 className="chart-title">Pengeluaran per Hari</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData.length > 0 ? barData : [{ date: "-", total: 0 }]}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Total"]} />
            <Bar dataKey="total" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card glass">
        <h3 className="chart-title">Distribusi Kategori</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData.length > 0 ? pieData : [{ name: "Belum ada data", value: 1, color: "#eee" }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name }) => name}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Total"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
