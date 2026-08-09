import { createUiPreferenceStore } from "./ui-preference.js";

export function bindSettingsPage(form, {
  preferenceStore = createUiPreferenceStore(),
  locationRef = globalThis.location,
} = {}) {
  const selected = preferenceStore.load();
  const selectedControl = form?.querySelector(`[name="ui"][value="${selected}"]`);
  if (selectedControl) selectedControl.checked = true;

  form?.addEventListener("submit", event => {
    event.preventDefault();
    const value = form.querySelector('[name="ui"]:checked')?.value;
    preferenceStore.save(value);
    locationRef.href = "./";
  });
}

if (typeof document !== "undefined") {
  bindSettingsPage(document.querySelector('form[data-action="save-ui"]'));
}
