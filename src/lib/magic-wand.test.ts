import { describe, expect, it, vi } from "vitest";

import {
  applyMaskDelete,
  combineMasks,
  drawSelectionOverlay,
  floodFillSelectionMask,
  maskHasSelection,
} from "./magic-wand";

function createImageData(width: number, height: number, pixels?: number[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  if (pixels) data.set(pixels);
  return { width, height, data } as ImageData;
}

function solidImage(width: number, height: number, rgba: [number, number, number, number]) {
  const imageData = createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const p = i * 4;
    imageData.data[p] = rgba[0];
    imageData.data[p + 1] = rgba[1];
    imageData.data[p + 2] = rgba[2];
    imageData.data[p + 3] = rgba[3];
  }
  return imageData;
}

describe("floodFillSelectionMask", () => {
  it("seleciona região contígua por cor", () => {
    const imageData = createImageData(3, 1, [255, 0, 0, 255, 255, 0, 0, 255, 0, 255, 0, 255]);

    const mask = floodFillSelectionMask(imageData, 0, 0, 10);
    expect(Array.from(mask)).toEqual([1, 1, 0]);
  });
});

describe("combineMasks", () => {
  it("substitui a seleção por padrão", () => {
    const base = new Uint8Array([1, 0, 1]);
    const next = new Uint8Array([0, 1, 0]);
    expect(Array.from(combineMasks(base, next, "replace"))).toEqual([0, 1, 0]);
  });

  it("soma seleções com modo add", () => {
    const base = new Uint8Array([1, 0, 0]);
    const next = new Uint8Array([0, 1, 0]);
    expect(Array.from(combineMasks(base, next, "add"))).toEqual([1, 1, 0]);
  });
});

describe("applyMaskDelete", () => {
  it("torna transparentes pixels selecionados", () => {
    const imageData = solidImage(2, 1, [255, 0, 0, 255]);
    const mask = new Uint8Array([1, 0]);
    applyMaskDelete(imageData, mask);
    expect(imageData.data[3]).toBe(0);
    expect(imageData.data[7]).toBe(255);
  });
});

describe("drawSelectionOverlay", () => {
  it("compõe overlay com drawImage em canvas temporário", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    expect(ctx).toBeTruthy();
    if (!ctx) return;

    const drawImageSpy = vi.spyOn(ctx, "drawImage");
    const mask = new Uint8Array([0, 1, 0, 0]);

    drawSelectionOverlay(ctx, mask, 4, 1);

    expect(drawImageSpy).toHaveBeenCalledTimes(1);
    drawImageSpy.mockRestore();
  });
});

describe("maskHasSelection", () => {
  it("detecta seleção vazia e preenchida", () => {
    expect(maskHasSelection(null)).toBe(false);
    expect(maskHasSelection(new Uint8Array([0, 0, 0]))).toBe(false);
    expect(maskHasSelection(new Uint8Array([0, 1, 0]))).toBe(true);
  });
});
