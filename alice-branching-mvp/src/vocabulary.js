import { storyGraph, storyLevels } from "./generated/story-bundle.js";
import { createStoryRuntime } from "./story-engine.js";

const runtime = createStoryRuntime(storyGraph, storyLevels[storyGraph.defaultLevel]);

export const vocabulary = runtime.vocabulary;
export const getVocabulary = runtime.getVocabulary;

export function recordVocabulary(session, word) {
  if (!getVocabulary(word)) return session;
  return {
    ...session,
    vocabTapped: session.vocabTapped.includes(word)
      ? [...session.vocabTapped]
      : [...session.vocabTapped, word],
  };
}
