export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

function colorDistance(r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2);
}

/** Flood fill que retorna máscara binária (1 = selecionado). */
export function floodFillSelectionMask(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);
  const index = (x: number, y: number) => (y * width + x) * 4;

  const sx = Math.max(0, Math.min(width - 1, startX));
  const sy = Math.max(0, Math.min(height - 1, startY));
  const seed = index(sx, sy);
  const sr = data[seed];
  const sg = data[seed + 1];
  const sb = data[seed + 2];
  const sa = data[seed + 3];

  if (sa === 0) return mask;

  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[sx, sy]];

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const vi = y * width + x;
    if (visited[vi]) continue;

    const i = index(x, y);
    if (colorDistance(data[i], data[i + 1], data[i + 2], data[i + 3], sr, sg, sb, sa) > tolerance) {
      continue;
    }

    visited[vi] = 1;
    mask[vi] = 1;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return mask;
}

export type SelectionCombineMode = "replace" | "add" | "subtract";

export function combineMasks(
  base: Uint8Array | null,
  next: Uint8Array,
  mode: SelectionCombineMode,
): Uint8Array {
  if (!base || mode === "replace") return next.slice();

  const out = base.slice();
  for (let i = 0; i < out.length; i++) {
    if (mode === "add") out[i] = out[i] || next[i] ? 1 : 0;
    if (mode === "subtract") out[i] = out[i] && !next[i] ? 1 : 0;
  }
  return out;
}

export function invertMask(mask: Uint8Array, imageData: ImageData): Uint8Array {
  const out = new Uint8Array(mask.length);
  const { width, height, data } = imageData;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const vi = y * width + x;
      const i = vi * 4;
      if (data[i + 3] === 0) continue;
      out[vi] = mask[vi] ? 0 : 1;
    }
  }
  return out;
}

export function maskHasSelection(mask: Uint8Array | null) {
  if (!mask) return false;
  return mask.some((v) => v === 1);
}

export async function loadImageRaster(src: string) {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível.");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { imageData, width: canvas.width, height: canvas.height, canvas, ctx };
}

export function imageDataToDataUrl(imageData: ImageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível.");
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Torna transparentes os pixels marcados na máscara. */
export function applyMaskDelete(imageData: ImageData, mask: Uint8Array) {
  const { width, height, data } = imageData;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const vi = y * width + x;
      if (mask[vi]) {
        const i = vi * 4;
        data[i + 3] = 0;
      }
    }
  }
}

export function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  mask: Uint8Array,
  width: number,
  height: number,
) {
  const overlay = ctx.createImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const p = i * 4;
    overlay.data[p] = 0;
    overlay.data[p + 1] = 196;
    overlay.data[p + 2] = 204;
    overlay.data[p + 3] = 100;
  }

  const temp = document.createElement("canvas");
  temp.width = width;
  temp.height = height;
  const tempCtx = temp.getContext("2d");
  if (!tempCtx) return;
  tempCtx.putImageData(overlay, 0, 0);
  ctx.drawImage(temp, 0, 0);
}

export function pointerToImagePixel(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  imageWidth: number,
  imageHeight: number,
) {
  const x = Math.floor(((clientX - canvasRect.left) / canvasRect.width) * imageWidth);
  const y = Math.floor(((clientY - canvasRect.top) / canvasRect.height) * imageHeight);
  return {
    x: Math.max(0, Math.min(imageWidth - 1, x)),
    y: Math.max(0, Math.min(imageHeight - 1, y)),
  };
}

export function pickImageElementAt(
  elements: { id: string; type: string; x: number; y: number; width: number; height: number }[],
  x: number,
  y: number,
) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type !== "image") continue;
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
      return el;
    }
  }
  return null;
}

export function slideCoordsFromPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  slideWidth: number,
  slideHeight: number,
) {
  return {
    x: ((clientX - rect.left) / rect.width) * slideWidth,
    y: ((clientY - rect.top) / rect.height) * slideHeight,
  };
}
