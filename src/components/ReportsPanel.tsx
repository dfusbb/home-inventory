"use client";

import ReportsView from "@/components/ReportsView";

interface ReportsPanelProps {
  onClose: () => void;
}

export default function ReportsPanel({ onClose }: ReportsPanelProps) {
  return (
    <ReportsView apiUrl="/api/reports" onClose={onClose} />
  );
}
