"use client";

import { useState, useRef, useCallback } from "react";

interface OcrResult {
  storeName?: string;
  total?: number;
  date?: string;
  items?: string;
  rawText: string;
}

interface BillScannerProps {
  onResult: (result: OcrResult) => void;
}

export default function BillScanner({ onResult }: BillScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setProcessing(true);
    setError(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);

      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng+ind", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        const { data } = await worker.recognize(dataUrl);
        await worker.terminate();

        const lines = data.text.split("\n").filter(Boolean);
        const storeName = lines[0]?.trim();

        const totalMatch = data.text.match(/(?:total|jumlah|bayar)\s*:?\s*(?:rp\.?\s*)?([\d.,\s]+)/i);
        let total: number | undefined;
        if (totalMatch) {
          const cleaned = totalMatch[1].replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
          total = parseFloat(cleaned);
          if (isNaN(total)) total = undefined;
        }

        const dateMatch = data.text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
        let date: string | undefined;
        if (dateMatch) {
          const [_, d, m, y] = dateMatch;
          const fullYear = y.length === 2 ? "20" + y : y;
          date = `${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }

        const items = lines.slice(1, -1).join(", ");

        onResult({ storeName, total, date, items, rawText: data.text });
      } catch (err) {
        setError("Gagal memproses gambar. Coba foto yang lebih jelas.");
      } finally {
        setProcessing(false);
        setProgress(0);
      }
    };
    reader.readAsDataURL(file);
  }, [onResult]);

  return (
    <div className="bill-scanner">
      <div
        className="upload-zone glass"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {image ? (
          <img src={image} alt="Bill preview" className="bill-preview" />
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">📄</span>
            <p>Klik atau drag & drop foto struk di sini</p>
            <p className="upload-hint">Format: JPG, PNG (maks 10MB)</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        hidden
      />

      {processing && (
        <div className="ocr-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p>Memproses OCR... {progress}%</p>
        </div>
      )}

      {error && <div className="ocr-error">{error}</div>}

      {image && !processing && (
        <button className="btn-secondary" onClick={() => { setImage(null); setError(null); }}>
          Scan Ulang
        </button>
      )}
    </div>
  );
}
