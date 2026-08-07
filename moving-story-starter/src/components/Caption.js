const escapeHtml = value => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

export function renderCaption(text) {
  return `<p id="story-caption" aria-live="polite" aria-atomic="true">${escapeHtml(text)}</p>`;
}

