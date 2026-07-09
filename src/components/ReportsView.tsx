"use client";

import { useCallback, useEffect, useState } from "react";

interface ReportLog {
  id: string;
  action: string;
  details: string | null;
  actorName: string;
  productName: string | null;
  createdAt: string;
  familyName?: string;
  address?: string;
}

type ReportPeriod = "day" | "week" | "month" | "custom";

interface ReportsViewProps {
  apiUrl: string;
  showFamily?: boolean;
  embedded?: boolean;
  onClose?: () => void;
}

export default function ReportsView({
  apiUrl,
  showFamily = false,
  embedded = false,
  onClose,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>("week");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        params.set("from", fromDate);
        params.set("to", toDate);
      }
      const res = await fetch(`${apiUrl}?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בטעינת דוח");
        return;
      }
      setLogs(data.logs);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, period, fromDate, toDate]);

  useEffect(() => {
    if (period !== "custom") {
      loadReport();
    }
  }, [period, loadReport]);

  const periodLabels: Record<Exclude<ReportPeriod, "custom">, string> = {
    day: "יומי",
    week: "שבועי",
    month: "חודשי",
  };

  const content = (
    <>
      <div className="flex flex-wrap gap-2 p-4 border-b border-border">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              period === p
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
        <button
          onClick={() => setPeriod("custom")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            period === "custom"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          לפי תאריכים
        </button>
      </div>

      {period === "custom" && (
        <div className="p-4 border-b border-border bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted block mb-1">מתאריך</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">עד תאריך</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm"
              />
            </div>
          </div>
          <button
            onClick={loadReport}
            disabled={!fromDate || !toDate}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            הצג דוח
          </button>
        </div>
      )}

      <div className={`overflow-y-auto p-4 ${embedded ? "flex-1" : "max-h-[50vh]"}`}>
        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
        {loading ? (
          <div className="text-center py-8 text-muted">טוען...</div>
        ) : (
          <>
            {Object.keys(summary).length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(summary).map(([action, count]) => (
                  <div
                    key={action}
                    className="p-3 rounded-xl bg-slate-50 border border-border text-center"
                  >
                    <p className="text-lg font-bold text-primary">{count}</p>
                    <p className="text-xs text-muted">{action}</p>
                  </div>
                ))}
              </div>
            )}

            {logs.length === 0 ? (
              <p className="text-center text-muted py-8">אין פעילות בתקופה זו</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-border bg-white text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">{log.action}</span>
                      <span className="text-xs text-muted shrink-0">
                        {new Date(log.createdAt).toLocaleString("he-IL")}
                      </span>
                    </div>
                    {showFamily && log.familyName && (
                      <p className="text-xs text-indigo-600 mt-0.5">
                        משפחת {log.familyName}
                        {log.address && ` · ${log.address}`}
                      </p>
                    )}
                    {log.productName && (
                      <p className="text-slate-600 mt-0.5">{log.productName}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      ע&quot;י {log.actorName}
                      {log.details && ` · ${log.details}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-gradient-to-l from-purple-50 to-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>📊</span> דוחות פעילות
          </h2>
          <p className="text-xs text-muted mt-0.5">יומי / שבועי / חודשי / לפי תאריכים</p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold">📊 דוחות פעילות</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
          )}
        </div>
        {content}
      </div>
    </div>
  );
}
