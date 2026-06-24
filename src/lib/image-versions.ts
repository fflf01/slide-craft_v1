import { nanoid } from "nanoid";

import type { ImageElement } from "./editor-store";

export interface ImageVersion {
  id: string;
  label: string;
  src: string;
  createdAt: string;
}

export function createImageVersion(src: string, label: string): ImageVersion {
  return {
    id: nanoid(8),
    label,
    src,
    createdAt: new Date().toISOString(),
  };
}

export function ensureImageVersions(el: ImageElement): ImageElement {
  if (el.versions?.length) {
    const active = el.versions.find((v) => v.id === el.activeVersionId) ?? el.versions[el.versions.length - 1];
    return { ...el, src: active.src, activeVersionId: active.id };
  }

  const original = createImageVersion(el.src, "Original");
  return {
    ...el,
    versions: [original],
    activeVersionId: original.id,
  };
}

export function getActiveImageVersion(el: ImageElement): ImageVersion {
  const normalized = ensureImageVersions(el);
  return normalized.versions!.find((v) => v.id === normalized.activeVersionId) ?? normalized.versions![0];
}

export function nextVersionLabel(versions: ImageVersion[]) {
  const edits = versions.filter((v) => v.label.startsWith("Edição")).length;
  return `Edição ${edits + 1}`;
}

export function buildImageElementPayload(src: string, radius = 12): Omit<ImageElement, "id" | "x" | "y" | "width" | "height" | "rotation" | "opacity"> {
  const version = createImageVersion(src, "Original");
  return {
    type: "image",
    src,
    radius,
    versions: [version],
    activeVersionId: version.id,
  };
}
