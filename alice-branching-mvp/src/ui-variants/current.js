import * as currentUi from "../ui.js";

export const currentRenderer = Object.freeze({
  id: "current",
  renderSetup: currentUi.renderSetup,
  renderScene: currentUi.renderScene,
  renderChipResponse: currentUi.renderChipResponse,
  renderEnding: currentUi.renderEnding,
  renderRecovery: currentUi.renderRecovery,
  renderVocabularyPanel: currentUi.renderVocabularyPanel,
});
