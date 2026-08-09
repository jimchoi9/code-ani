function storyStateOf(session) {
  return session?.storyState ?? session?.runs?.at?.(-1)?.storyState ?? {};
}

function selectVariant(selector, state) {
  return selector.cases?.[state?.[selector.stateKey]] ?? selector.default ?? null;
}

function renderParagraphs(entries = [], blocks = {}, selectors = {}, state = {}) {
  const paragraphs = [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      if (entry) paragraphs.push(entry);
      continue;
    }
    const variant = selectVariant(selectors[entry.block] ?? {}, state);
    if (!variant) continue;
    const selected = blocks[entry.block]?.[variant];
    if (!selected) throw new Error(`원고 블록 ${entry.block}.${variant}을 찾을 수 없습니다`);
    paragraphs.push(...selected.filter(Boolean));
  }
  return paragraphs.join("\n\n");
}

function mergeTransitions(structural = [], labels = {}, state, endingByEncounter) {
  return structural.map(item => {
    const content = labels[item.id];
    const dynamicNext = item.dynamicNext === "endingByEncounter"
      ? endingByEncounter[state.encounterId] ?? null
      : item.nextSceneId;
    return {
      id: item.id,
      ...(typeof content === "string" ? { label: content } : content),
      ...(dynamicNext ? { nextSceneId: dynamicNext } : {}),
      ...(item.effect ? { effect: { ...item.effect } } : {}),
    };
  });
}

function estimateReadSeconds(body, charactersPerMinute) {
  return Math.ceil(body.replace(/\s/g, "").length * 60 / charactersPerMinute);
}

export function createStoryRuntime(graph, levelContent) {
  if (!graph || !levelContent) throw new Error("스토리 그래프와 난이도 원고가 필요합니다");

  function buildScene(sceneId, session = {}) {
    const structure = graph.scenes[sceneId];
    const content = levelContent.scenes[sceneId];
    if (!structure || !content) return null;

    const state = storyStateOf(session);
    const contentSelectors = graph.contentSelectors?.[sceneId] ?? {};
    const presentationSelectors = graph.presentationSelectors?.[sceneId] ?? {};
    const body = renderParagraphs(content.body, content.blocks, contentSelectors, state);
    const art = selectVariant(presentationSelectors.art ?? {}, state) ?? structure.art;
    const spotArt = selectVariant(presentationSelectors.spotArt ?? {}, state);
    const choices = structure.choices
      ? mergeTransitions(structure.choices, content.choices, state, graph.endingByEncounter)
      : undefined;
    const chips = structure.chips
      ? mergeTransitions(structure.chips, content.chips, state, graph.endingByEncounter)
      : undefined;
    const endingVariation = state.endingVariation;
    const parentNoteVariant = endingVariation ? content.parentNoteVariants?.[endingVariation] : null;

    return {
      id: sceneId,
      type: structure.type,
      title: content.title,
      art,
      body,
      estimatedReadSeconds: estimateReadSeconds(body, graph.readingModel.charactersPerMinute),
      vocab: [...content.vocab],
      ...(choices ? { choices } : {}),
      ...(chips ? { chips } : {}),
      ...(structure.nextSceneId ? { nextSceneId: structure.nextSceneId } : {}),
      ...(content.prompt ? { prompt: content.prompt } : {}),
      ...(content.afterChip ? { afterChip: renderParagraphs(content.afterChip) } : {}),
      ...(content.trait ? { trait: content.trait } : {}),
      ...(structure.sourceSceneId ? { sourceSceneId: structure.sourceSceneId } : {}),
      ...(content.choiceRecall ? { choiceRecall: content.choiceRecall } : {}),
      ...(content.parentNote ? {
        parentNote: parentNoteVariant ? `${content.parentNote} ${parentNoteVariant}` : content.parentNote,
      } : {}),
      ...(endingVariation ? {
        returnAdjustment: content.blocks?.returnAdjustment?.[endingVariation]?.join("\n\n"),
      } : {}),
      ...(spotArt ? { spotArt } : {}),
    };
  }

  const scenes = Object.fromEntries(graph.sceneOrder.map(sceneId => [sceneId, buildScene(sceneId)]));
  const story = {
    id: graph.id,
    title: levelContent.title,
    startSceneId: graph.startSceneId,
    sceneOrder: [...graph.sceneOrder],
    screenCounts: { ...graph.screenCounts },
    readingModel: { ...graph.readingModel },
    scenes,
  };

  return {
    story,
    vocabulary: Object.freeze({ ...levelContent.vocabulary }),
    getScene(sceneId) {
      return story.scenes[sceneId] ?? null;
    },
    resolveScene(sceneId, session = {}) {
      return buildScene(sceneId, session);
    },
    getVocabulary(word) {
      return levelContent.vocabulary[word] ?? null;
    },
    estimateRouteSeconds(route) {
      return graph.readingModel.setupSeconds
        + route.scenes.reduce((seconds, scene) => seconds + scene.estimatedReadSeconds, 0)
        + route.chipResponseScreens * graph.readingModel.chipResponseSeconds;
    },
  };
}
