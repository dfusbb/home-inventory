"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  canvasToBlob,
  processCanvas,
} from "@/lib/image-processing";
import { createImage, getCroppedImg } from "@/lib/crop-utils";

interface ImageEditorModalProps {
  file: File;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
}

export default function ImageEditorModal({
  file,
  onClose,
  onSave,
}: ImageEditorModalProps) {
  const [imageSrc, setImageSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [autoTrim, setAutoTrim] = useState(true);
  const [darkThreshold, setDarkThreshold] = useState(85);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const buildPreview = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      let canvas = await getCroppedImg(imageSrc, croppedAreaPixels);
      canvas = processCanvas(canvas, {
        removeDarkBackground: removeBackground,
        darkThreshold,
        autoTrim,
        trimPadding: 4,
      });

      const blob = await canvasToBlob(
        canvas,
        removeBackground ? "image/png" : "image/jpeg",
        0.92
      );
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, removeBackground, darkThreshold, autoTrim]);

  useEffect(() => {
    const timer = setTimeout(() => {
      buildPreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [buildPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleSave() {
    if (!imageSrc) return;
    setSaving(true);
    setSaveError("");
    try {
      let pixels = croppedAreaPixels;
      if (!pixels) {
        const img = await createImage(imageSrc);
        pixels = { x: 0, y: 0, width: img.width, height: img.height };
      }

      let canvas = await getCroppedImg(imageSrc, pixels);
      canvas = processCanvas(canvas, {
        removeDarkBackground: removeBackground,
        darkThreshold,
        autoTrim,
        trimPadding: 4,
      });
      const blob = await canvasToBlob(
        canvas,
        removeBackground ? "image/png" : "image/jpeg",
        0.92
      );
      await onSave(blob);
    } catch {
      setSaveError("שגיאה בשמירת התמונה. נסו שוב.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">עריכת תמונה</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="relative h-56 bg-slate-900 shrink-0">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onCropAreaChange={(_, pixels) => setCroppedAreaPixels(pixels)}
              objectFit="contain"
            />
          )}
        </div>

        <div className="px-4 py-3 border-b border-border shrink-0">
          <label className="text-xs text-muted mb-1 block">זום</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-slate-50 cursor-pointer">
            <div>
              <p className="font-medium text-sm">חיתוך שוליים אוטומטי</p>
              <p className="text-xs text-muted">מגדיל את המוצר בתצוגה</p>
            </div>
            <input
              type="checkbox"
              checked={autoTrim}
              onChange={(e) => setAutoTrim(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-slate-50">
            <div>
              <p className="font-medium text-sm">הסר רקע כהה</p>
              <p className="text-xs text-muted">אופציונלי – רק אם יש רקע כהה</p>
            </div>
            <input
              type="checkbox"
              checked={removeBackground}
              onChange={(e) => setRemoveBackground(e.target.checked)}
              className="w-5 h-5 accent-primary"
            />
          </label>

          {removeBackground && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <label className="text-xs text-slate-600 mb-1 block">
                רגישות הסרת רקע
              </label>
              <input
                type="range"
                min={50}
                max={130}
                value={darkThreshold}
                onChange={(e) => setDarkThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted mt-1">
                גרור ימינה אם הרקע לא הוסר לגמרי
              </p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted mb-2">תצוגה מקדימה</p>
            <div className="flex justify-center">
              <div className="w-28 h-28 rounded-xl border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:12px_12px] flex items-center justify-center overflow-hidden">
                {processing ? (
                  <span className="text-xs text-muted">מעבד...</span>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="תצוגה מקדימה"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted">טוען...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {saveError && (
          <p className="px-4 pb-2 text-sm text-red-500 text-center">{saveError}</p>
        )}

        <div className="p-4 border-t border-border flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-medium"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || processing || !imageSrc}
            className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמור תמונה"}
          </button>
        </div>
      </div>
    </div>
  );
}
