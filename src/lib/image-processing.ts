export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessImageOptions {
  removeDarkBackground?: boolean;
  darkThreshold?: number;
  autoTrim?: boolean;
  trimPadding?: number;
  crop?: CropArea;
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  return { canvas, ctx };
}

function getLuminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleCornerBackground(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  const samples: [number, number, number][] = [];
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];

  for (const [x, y] of points) {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }

  const darkSamples = samples.filter(
    ([r, g, b]) => getLuminance(r, g, b) < 120
  );

  const use = darkSamples.length >= 3 ? darkSamples : samples;
  const r = use.reduce((s, c) => s + c[0], 0) / use.length;
  const g = use.reduce((s, c) => s + c[1], 0) / use.length;
  const b = use.reduce((s, c) => s + c[2], 0) / use.length;
  return { r, g, b };
}

function removeDarkBackgroundFromImageData(
  imageData: ImageData,
  threshold: number
) {
  const { data, width, height } = imageData;
  const bg = sampleCornerBackground(data, width, height);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = getLuminance(r, g, b);
    const dist = colorDistance(r, g, b, bg.r, bg.g, bg.b);

    const isDark = luminance < threshold;
    const isSimilarToBg = dist < 55 && luminance <= bgLuminance + 35;

    if (isDark || isSimilarToBg) {
      const edgeFactor = Math.min(
        1,
        Math.max(0, (threshold - luminance) / 40)
      );
      const alphaFactor = isSimilarToBg ? 0 : edgeFactor * 0.85;
      data[i + 3] = Math.round(data[i + 3] * (1 - alphaFactor));
    }
  }

  // Second pass: flood from edges for connected dark regions
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const trySeed = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const lum = getLuminance(data[i], data[i + 1], data[i + 2]);
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b);
    if (lum < threshold + 15 || (dist < 65 && lum < bgLuminance + 50)) {
      visited[idx] = 1;
      queue.push(idx);
    }
  };

  for (let x = 0; x < width; x++) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % width;
    const y = Math.floor(idx / width);
    const i = idx * 4;
    data[i + 3] = 0;

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      const ni = nIdx * 4;
      const lum = getLuminance(data[ni], data[ni + 1], data[ni + 2]);
      const dist = colorDistance(data[ni], data[ni + 1], data[ni + 2], bg.r, bg.g, bg.b);
      if (lum < threshold + 20 || (dist < 70 && lum < bgLuminance + 55)) {
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }
}

function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaMin = 24
) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      const lum = getLuminance(data[i], data[i + 1], data[i + 2]);
      if (alpha > alphaMin && lum > 20) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!found) {
    return { x: 0, y: 0, width, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function drawImageToCanvas(img: HTMLImageElement, crop?: CropArea) {
  const source = crop ?? { x: 0, y: 0, width: img.width, height: img.height };
  const { canvas, ctx } = createCanvas(source.width, source.height);
  ctx.drawImage(
    img,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    source.width,
    source.height
  );
  return canvas;
}

export function processCanvas(
  sourceCanvas: HTMLCanvasElement,
  options: ProcessImageOptions
): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(sourceCanvas.width, sourceCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0);

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (options.removeDarkBackground) {
    removeDarkBackgroundFromImageData(
      imageData,
      options.darkThreshold ?? 85
    );
    ctx.putImageData(imageData, 0, 0);
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  if (options.autoTrim) {
    const bounds = findContentBounds(
      imageData.data,
      canvas.width,
      canvas.height
    );
    const padding = options.trimPadding ?? 6;
    const x = Math.max(0, bounds.x - padding);
    const y = Math.max(0, bounds.y - padding);
    const w = Math.min(canvas.width - x, bounds.width + padding * 2);
    const h = Math.min(canvas.height - y, bounds.height + padding * 2);

    const trimmed = createCanvas(w, h);
    trimmed.ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    return trimmed.canvas;
  }

  return canvas;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export image"))),
      type,
      quality
    );
  });
}

export async function processImageFile(
  file: File,
  options: ProcessImageOptions
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  let canvas = drawImageToCanvas(img, options.crop);
  canvas = processCanvas(canvas, options);
  const usePng = options.removeDarkBackground || file.type === "image/png";
  return canvasToBlob(canvas, usePng ? "image/png" : "image/jpeg", 0.92);
}

export async function getCroppedImageBlob(
  imageSrc: string,
  crop: CropArea
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = drawImageToCanvas(img, crop);
  return canvasToBlob(canvas, "image/png", 0.92);
}
