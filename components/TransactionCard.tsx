"use client";

import { formatRupiah } from "@/lib/telegram";

interface Transaction {
  id: number;
  storeName: string;
  item: string;
  total: number;
  date: string;
  categoryId: number | null;
  source: string | null;
  billImageUrl: string | null;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface TransactionCardProps {
  transaction: Transaction;
  category?: Category;
  onDelete?: (id: number) => void;
}

export default function TransactionCard({ transaction, category, onDelete }: TransactionCardProps) {
  return (
    <div className="transaction-card glass">
      <div className="transaction-card-header">
        <div className="transaction-store">{transaction.storeName}</div>
        <div className="transaction-amount">{formatRupiah(transaction.total)}</div>
      </div>
      <div className="transaction-card-body">
        <div className="transaction-item">{transaction.item}</div>
        <div className="transaction-meta">
          <span className="transaction-date">{transaction.date}</span>
          {category && (
            <span
              className="transaction-category"
              style={{ color: category.color }}
            >
              {category.icon} {category.name}
            </span>
          )}
          {transaction.source && transaction.source !== "manual" && (
            <span className="transaction-source">{transaction.source}</span>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          className="transaction-delete"
          onClick={() => onDelete(transaction.id)}
          aria-label="Hapus transaksi"
        >
          Hapus
        </button>
      )}
    </div>
  );
}
