import { currentRenderer } from "./ui-variants/current.js";
import { minimalTextRenderer } from "./ui-variants/minimal-text.js";
import {
  getVisualNovelProgress,
  getVisualNovelSpeaker,
  visualNovelRenderer,
} from "./ui-variants/visual-novel.js";

export { getVisualNovelProgress, getVisualNovelSpeaker };

export const SUPPORTED_UI_IDS = Object.freeze(["current", "visual-novel", "minimal"]);

export function parseUiVariant(search = "") {
  const id = new URLSearchParams(search).get("ui");
  return SUPPORTED_UI_IDS.includes(id) ? id : "current";
}

export function createCompareLinks(search = "") {
  const params = new URLSearchParams(search);
  params.set("compare", "1");
  return SUPPORTED_UI_IDS.map(id => {
    const next = new URLSearchParams(params);
    next.set("ui", id);
    return { id, href: `?${next.toString()}` };
  });
}

export function getUiRenderer(id) {
  if (id === "visual-novel") return visualNovelRenderer;
  if (id === "minimal") return minimalTextRenderer;
  return currentRenderer;
}
