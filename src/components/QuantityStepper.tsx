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

function snapToStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, raw));
  if (step >= 1) {
    return Math.round(clamped);
  }
  const snapped = Math.round(clamped / step) * step;
  return Math.round(snapped * 100) / 100;
}

function findOptionIndex(options: number[], value: number, step: number): number {
  const idx = options.findIndex((o) => Math.abs(o - value) < step / 2);
  return Math.max(0, idx);
}

function scrollItemClass(distance: number): string {
  if (distance === 0) return "text-2xl font-bold text-orange-700";
  if (distance === 1) return "text-lg font-semibold text-slate-400";
  if (distance === 2) return "text-base text-slate-300";
  return "text-sm text-slate-200";
}

interface QuantityScrollPickerProps {
  value: number;
  step: number;
  min: number;
  max: number;
  unitLabel?: string;
  onSelect: (value: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function QuantityScrollPicker({
  value,
  step,
  min,
  max,
  unitLabel,
  onSelect,
  onConfirm,
  onCancel,
}: QuantityScrollPickerProps) {
  const options = useMemo(() => buildOptions(min, max, step), [min, max, step]);
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const selectedIndex = findOptionIndex(options, value, step);
  const [inputText, setInputText] = useState(formatValue(value, step));
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (!inputFocused) {
      setInputText(formatValue(value, step));
    }
  }, [value, step, inputFocused]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = selectedIndex * itemHeight;
  }, [selectedIndex]);

  function scrollToIndex(index: number) {
    const el = listRef.current;
    if (el) {
      el.scrollTop = index * itemHeight;
    }
  }

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    if (options[clamped] !== undefined) {
      onSelect(options[clamped]);
    }
  }

  function handleInputChange(text: string) {
    setInputText(text);
    const parsed = Number(text.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    onSelect(snapToStep(parsed, min, max, step));
  }

  function handleInputBlur() {
    setInputFocused(false);
    const parsed = Number(inputText.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setInputText(formatValue(value, step));
      return;
    }
    const snapped = snapToStep(parsed, min, max, step);
    onSelect(snapped);
    setInputText(formatValue(snapped, step));
    scrollToIndex(findOptionIndex(options, snapped, step));
  }

  function handleOptionClick(opt: number, index: number) {
    onSelect(opt);
    scrollToIndex(index);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-xs p-4 animate-slide-up">
        <p className="text-center text-sm font-medium text-slate-600 mb-1">
          בחרו כמות{unitLabel ? ` (${unitLabel})` : ""}
        </p>
        <p className="text-center text-xs text-muted mb-3">גללו, הקלידו או לחצו על מספר</p>

        <div className="flex justify-center mb-3">
          <input
            type="text"
            inputMode={step >= 1 ? "numeric" : "decimal"}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
                onConfirm();
              }
            }}
            className="w-28 text-center text-2xl font-bold text-orange-700 border-2 border-orange-300 rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-200"
            aria-label="הקלדת כמות"
          />
        </div>

        <div className="relative h-56">
          <div className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 h-11 rounded-lg border-2 border-orange-300 z-10" />
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto scroll-smooth snap-y snap-mandatory relative z-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollPaddingBlock: `${itemHeight * 2}px` }}
          >
            <div style={{ height: itemHeight * 2 }} />
            {options.map((opt, index) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleOptionClick(opt, index)}
                className={`w-full snap-center flex items-center justify-center select-none transition-colors ${scrollItemClass(
                  Math.abs(index - selectedIndex)
                )}`}
                style={{ height: itemHeight }}
              >
                {formatValue(opt, step)}
              </button>
            ))}
            <div style={{ height: itemHeight * 2 }} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent z-10" />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-semibold"
          >
            אישור
          </button>
        </div>
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
  const [valueWhenOpened, setValueWhenOpened] = useState(value);

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
          onConfirm={() => {
            apply(pickerValue);
            setShowPicker(false);
          }}
          onCancel={() => {
            setPickerValue(valueWhenOpened);
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
            setValueWhenOpened(value);
            setPickerValue(value);
            setShowPicker(true);
          }}
          className={valueClass}
          title="לחצו לבחירת כמות בגלילה או הקלדה"
          aria-label="לחצו לבחירת כמות בגלילה או הקלדה"
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
