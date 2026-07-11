"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { quantityStep, type QuantityUnit } from "@/lib/units";

function formatValue(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  const formatted = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return formatted;
}

function buildOptions(min: number, max: number, step: number): number[] {
  const opts: number[] = [];
  const count = Math.round((max - min) / step) + 1;
  for (let i = 0; i < count; i++) {
    const v = Math.round((min + i * step) * 100) / 100;
    if (v > max + 0.001) break;
    opts.push(v);
  }
  return opts;
}

interface QuantityScrollPickerProps {
  value: number;
  step: number;
  min: number;
  max: number;
  unitLabel?: string;
  onSelect: (value: number) => void;
  onClose: () => void;
}

function QuantityScrollPicker({
  value,
  step,
  min,
  max,
  unitLabel,
  onSelect,
  onClose,
}: QuantityScrollPickerProps) {
  const options = useMemo(() => buildOptions(min, max, step), [min, max, step]);
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;

  useEffect(() => {
    const index = Math.max(0, options.findIndex((o) => Math.abs(o - value) < step / 2));
    const el = listRef.current;
    if (el) {
      el.scrollTop = index * itemHeight;
    }
  }, [options, value, step]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    if (options[clamped] !== undefined) {
      onSelect(options[clamped]);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-xs p-4 animate-slide-up">
        <p className="text-center text-sm font-medium text-slate-600 mb-1">
          בחרו כמות{unitLabel ? ` (${unitLabel})` : ""}
        </p>
        <p className="text-center text-xs text-muted mb-3">גללו עד המספר הרצוי</p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 rounded-lg bg-orange-50 border border-orange-200 z-10" />
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-56 overflow-y-auto scroll-smooth snap-y snap-mandatory"
            style={{ scrollPaddingBlock: `${itemHeight * 2}px` }}
          >
            <div style={{ height: itemHeight * 2 }} />
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onSelect(opt)}
                className={`w-full snap-center flex items-center justify-center font-bold text-lg ${
                  Math.abs(opt - value) < step / 2 ? "text-orange-700" : "text-slate-500"
                }`}
                style={{ height: itemHeight }}
              >
                {formatValue(opt, step)}
              </button>
            ))}
            <div style={{ height: itemHeight * 2 }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-orange-500 text-white font-semibold"
        >
          אישור
        </button>
      </div>
    </div>
  );
}

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  unit?: QuantityUnit | "piece";
  step?: number;
  min?: number;
  max?: number;
  unitLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function QuantityStepper({
  value,
  onChange,
  onCommit,
  unit = "unit",
  step: stepProp,
  min = 0,
  max,
  unitLabel,
  compact = false,
  disabled = false,
  className = "",
}: QuantityStepperProps) {
  const step = stepProp ?? quantityStep(unit === "piece" ? "unit" : unit);
  const resolvedMax = max ?? (unit === "kg" ? 50 : 500);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerValue, setPickerValue] = useState(value);

  useEffect(() => {
    if (!showPicker) setPickerValue(value);
  }, [value, showPicker]);

  function apply(next: number) {
    const clamped = Math.max(min, Math.min(resolvedMax, next));
    onChange(clamped);
    onCommit?.(clamped);
  }

  function adjust(delta: number) {
    apply(value + delta * step);
  }

  const btnClass = compact
    ? "w-7 h-7 rounded-lg bg-slate-100 font-bold text-sm"
    : "w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm";

  const valueClass = compact
    ? "w-14 text-center text-xs font-semibold cursor-pointer hover:text-orange-700 underline decoration-dotted underline-offset-2"
    : "min-w-[3.5rem] px-1 text-center font-bold text-sm cursor-pointer hover:text-orange-700 underline decoration-dotted underline-offset-2";

  return (
    <>
      {showPicker && (
        <QuantityScrollPicker
          value={pickerValue}
          step={step}
          min={min}
          max={resolvedMax}
          unitLabel={unitLabel}
          onSelect={setPickerValue}
          onClose={() => {
            apply(pickerValue);
            setShowPicker(false);
          }}
        />
      )}
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={(e) => {
            e.stopPropagation();
            adjust(-1);
          }}
          className={`${btnClass} disabled:opacity-40`}
        >
          −
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setPickerValue(value);
            setShowPicker(true);
          }}
          className={valueClass}
          title="לחצו לבחירת כמות בגלילה"
          aria-label="לחצו לבחירת כמות בגלילה"
        >
          {formatValue(value, step)}
          {unitLabel && !compact && (
            <span className="block text-[10px] font-normal text-muted">{unitLabel}</span>
          )}
        </button>
        <button
          type="button"
          disabled={disabled || value >= resolvedMax}
          onClick={(e) => {
            e.stopPropagation();
            adjust(1);
          }}
          className={`${btnClass} disabled:opacity-40`}
        >
          +
        </button>
      </div>
    </>
  );
}
