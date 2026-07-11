"use client";

import { useEffect, useState } from "react";

interface ProductThumbnailProps {
  productId: string;
  hasImage: boolean;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallback?: React.ReactNode;
}

export default function ProductThumbnail({
  productId,
  hasImage,
  alt,
  className = "max-w-full max-h-full object-contain",
  containerClassName = "w-14 h-14 rounded-lg border border-border bg-[repeating-conic-gradient(#e2e8f0_0%_25%,#f8fafc_0%_50%)] bg-[length:8px_8px] flex items-center justify-center overflow-hidden shrink-0",
  fallback,
}: ProductThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(hasImage);

  useEffect(() => {
    if (!hasImage) {
      setSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/products/${productId}/image`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { imageUrl?: string | null } | null) => {
        if (!cancelled) setSrc(data?.imageUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, hasImage]);

  const defaultFallback = fallback ?? (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xl">
      📦
    </div>
  );

  if (!hasImage) {
    return <div className={containerClassName}>{defaultFallback}</div>;
  }

  return (
    <div className={containerClassName}>
      {loading ? (
        <div className="w-full h-full bg-slate-100 animate-pulse" />
      ) : src ? (
        <img src={src} alt={alt} className={className} />
      ) : (
        defaultFallback
      )}
    </div>
  );
}
