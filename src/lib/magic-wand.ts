function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = src;
  });
}

function colorDistance(r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2);
}

function floodFillTransparent(imageData: ImageData, startX: number, startY: number, tolerance: number) {
  const { width, height, data } = imageData;
  const index = (x: number, y: number) => (y * width + x) * 4;

  const sx = Math.max(0, Math.min(width - 1, startX));
  const sy = Math.max(0, Math.min(height - 1, startY));
  const seed = index(sx, sy);
  const sr = data[seed];
  const sg = data[seed + 1];
  const sb = data[seed + 2];
  const sa = data[seed + 3];

  if (sa === 0) return;

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
    data[i + 3] = 0;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
}

/** Remove pixels similares à cor clicada (flood fill com tolerância). */
export async function applyMagicWandToImage(
  src: string,
  clickX: number,
  clickY: number,
  displayWidth: number,
  displayHeight: number,
  tolerance: number,
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não disponível.");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const px = Math.floor((clickX / displayWidth) * canvas.width);
  const py = Math.floor((clickY / displayHeight) * canvas.height);

  floodFillTransparent(imageData, px, py, tolerance);
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
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
