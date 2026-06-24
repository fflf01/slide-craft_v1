import { describe, expect, it } from "vitest";

import type { ImageElement } from "./editor-store";
import {
  createImageVersion,
  ensureImageVersions,
  getActiveImageVersion,
  nextVersionLabel,
} from "./image-versions";

function makeImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: "img-1",
    type: "image",
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    rotation: 0,
    opacity: 1,
    src: "https://example.com/photo.jpg",
    radius: 0,
    ...overrides,
  };
}

describe("ensureImageVersions", () => {
  it("cria versão Original quando não há histórico", () => {
    const el = makeImageElement();
    const normalized = ensureImageVersions(el);

    expect(normalized.versions).toHaveLength(1);
    expect(normalized.versions![0].label).toBe("Original");
    expect(normalized.versions![0].src).toBe(el.src);
    expect(normalized.activeVersionId).toBe(normalized.versions![0].id);
    expect(normalized.src).toBe(el.src);
  });

  it("usa a versão ativa quando já existem versões", () => {
    const edited = createImageVersion("data:image/png;base64,abc", "Edição 1");
    const original = createImageVersion("https://example.com/photo.jpg", "Original");
    const el = makeImageElement({
      src: "https://example.com/stale.jpg",
      versions: [original, edited],
      activeVersionId: edited.id,
    });

    const normalized = ensureImageVersions(el);

    expect(normalized.src).toBe(edited.src);
    expect(normalized.activeVersionId).toBe(edited.id);
  });

  it("cai para a última versão se activeVersionId for inválido", () => {
    const original = createImageVersion("https://example.com/a.jpg", "Original");
    const edited = createImageVersion("data:image/png;base64,xyz", "Edição 1");
    const el = makeImageElement({
      versions: [original, edited],
      activeVersionId: "missing-id",
    });

    const normalized = ensureImageVersions(el);

    expect(normalized.src).toBe(edited.src);
    expect(normalized.activeVersionId).toBe(edited.id);
  });
});

describe("getActiveImageVersion", () => {
  it("retorna a versão ativa normalizada", () => {
    const original = createImageVersion("https://example.com/a.jpg", "Original");
    const el = makeImageElement({ versions: [original], activeVersionId: original.id });
    expect(getActiveImageVersion(el).id).toBe(original.id);
  });
});

describe("nextVersionLabel", () => {
  it("incrementa rótulos de edição", () => {
    const original = createImageVersion("a", "Original");
    expect(nextVersionLabel([original])).toBe("Edição 1");

    const edit1 = createImageVersion("b", "Edição 1");
    expect(nextVersionLabel([original, edit1])).toBe("Edição 2");
  });
});
