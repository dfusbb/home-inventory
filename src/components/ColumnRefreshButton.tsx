"use client";

interface ColumnRefreshButtonProps {
  onRefresh: () => void;
  refreshing?: boolean;
}

export default function ColumnRefreshButton({
  onRefresh,
  refreshing = false,
}: ColumnRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      title="רענן"
      aria-label="רענן"
      className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700 disabled:opacity-50 hover:bg-blue-100 transition"
    >
      <span className={refreshing ? "inline-block animate-spin" : ""}>🔄</span>{" "}
      רענן
    </button>
  );
}
