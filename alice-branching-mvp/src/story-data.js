import { storyGraph, storyLevels } from "./generated/story-bundle.js";
import { normalizeStoryLevel } from "./session.js";
import { createStoryRuntime } from "./story-engine.js";

const level = storyLevels[storyGraph.defaultLevel];
const runtimes = Object.freeze(Object.fromEntries(
  Object.entries(storyLevels).map(([levelId, content]) => [
    levelId,
    createStoryRuntime(storyGraph, content),
  ]),
));
const runtime = runtimes[storyGraph.defaultLevel];
const referenceEnding = level.scenes[Object.values(storyGraph.endingByEncounter)[0]];
const spotArtCases = storyGraph.presentationSelectors.E1.spotArt.cases;

export const ENDING_BY_ENCOUNTER = storyGraph.endingByEncounter;
export const ENDING_VARIATIONS = Object.freeze(Object.fromEntries(
  Object.keys(spotArtCases).map(key => [key, Object.freeze({
    spotArt: spotArtCases[key],
    body: referenceEnding.blocks.endingVariation[key].join("\n\n"),
    parentNote: referenceEnding.parentNoteVariants[key],
  })]),
));

export const story = runtime.story;
export const getScene = runtime.getScene;
export const resolveScene = runtime.resolveScene;
export const estimateRouteSeconds = runtime.estimateRouteSeconds;

export function getStoryRuntime(levelId) {
  return runtimes[normalizeStoryLevel(levelId)];
}
