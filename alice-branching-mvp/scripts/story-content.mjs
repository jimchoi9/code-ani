import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { visualNovelAssets } from "../assets/visual-novel/manifest.js";

function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

const ALLOWED_TOKENS = new Set(["HERO", "TREAT", "PET", "은/는", "이/가", "을/를", "와/과"]);

function transitions(scene) {
  return [
    ...(scene.choices ?? []),
    ...(scene.chips ?? []),
    ...(scene.nextSceneId ? [{ id: "continue", nextSceneId: scene.nextSceneId }] : []),
  ];
}

function visitStrings(value, path, visit) {
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitStrings(item, `${path}.${index}`, visit));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) visitStrings(item, `${path}.${key}`, visit);
}

function assertSceneParity(graph, levelId, level) {
  const graphIds = Object.keys(graph.scenes).sort();
  const contentIds = Object.keys(level.scenes).sort();
  const missing = graphIds.find(id => !contentIds.includes(id));
  if (missing) fail(`${levelId}.scenes.${missing}`, "장면 원고가 없습니다");
  const extra = contentIds.find(id => !graphIds.includes(id));
  if (extra) fail(`${levelId}.scenes.${extra}`, "그래프에 없는 장면입니다");
}

function assertReachableEndings(graph) {
  const memo = new Map();
  const reachesEnding = (sceneId, visiting = new Set()) => {
    if (memo.has(sceneId)) return memo.get(sceneId);
    const scene = graph.scenes[sceneId];
    if (scene.type === "ending") return true;
    if (visiting.has(sceneId)) return false;
    const nextVisiting = new Set(visiting).add(sceneId);
    const result = transitions(scene).some(item => {
      if (item.nextSceneId) return reachesEnding(item.nextSceneId, nextVisiting);
      if (item.dynamicNext === "endingByEncounter") {
        return Object.values(graph.endingByEncounter).some(id => reachesEnding(id, nextVisiting));
      }
      return false;
    });
    memo.set(sceneId, result);
    return result;
  };

  for (const sceneId of Object.keys(graph.scenes)) {
    if (!reachesEnding(sceneId)) fail(`graph.scenes.${sceneId}`, "결말에 도달할 수 없습니다");
  }
}

export function validateStorySources({ graph, levels, assetKeys = new Set() }) {
  const graphIds = Object.keys(graph.scenes);
  if (new Set(graph.sceneOrder).size !== graphIds.length || graph.sceneOrder.some(id => !graph.scenes[id])) {
    fail("graph.sceneOrder", "실제 장면 ID와 일치해야 합니다");
  }
  if (!levels[graph.defaultLevel]) fail("graph.defaultLevel", `원고가 없는 난이도 ${graph.defaultLevel}`);
  if (!graph.scenes[graph.startSceneId]) fail("graph.startSceneId", `존재하지 않는 시작 장면 ${graph.startSceneId}`);
  for (const [encounterId, endingId] of Object.entries(graph.endingByEncounter)) {
    if (graph.scenes[endingId]?.type !== "ending") {
      fail(`graph.endingByEncounter.${encounterId}`, `존재하지 않는 결말 ${endingId}`);
    }
  }

  for (const [sceneId, graphScene] of Object.entries(graph.scenes)) {
    if (assetKeys.size && !assetKeys.has(graphScene.art)) {
      fail(`graph.scenes.${sceneId}.art`, `등록되지 않은 삽화 키 ${graphScene.art}`);
    }
    for (const item of transitions(graphScene)) {
      if (item.nextSceneId && !graph.scenes[item.nextSceneId]) {
        const group = graphScene.chips?.includes(item) ? "chips" : "choices";
        fail(`graph.scenes.${sceneId}.${group}.${item.id}.nextSceneId`, `존재하지 않는 장면 ${item.nextSceneId}`);
      }
    }
    for (const [property, selector] of Object.entries(graph.presentationSelectors?.[sceneId] ?? {})) {
      for (const [stateValue, artKey] of Object.entries(selector.cases ?? {})) {
        if (assetKeys.size && !assetKeys.has(artKey)) {
          fail(`graph.presentationSelectors.${sceneId}.${property}.cases.${stateValue}`, `등록되지 않은 삽화 키 ${artKey}`);
        }
      }
      if (selector.default && assetKeys.size && !assetKeys.has(selector.default)) {
        fail(`graph.presentationSelectors.${sceneId}.${property}.default`, `등록되지 않은 삽화 키 ${selector.default}`);
      }
    }
  }
  assertReachableEndings(graph);

  for (const [levelId, level] of Object.entries(levels)) {
    if (level.level !== levelId) fail(`${levelId}.level`, "파일 난이도 ID와 일치해야 합니다");
    if (level.storyId !== graph.id) fail(`${levelId}.storyId`, "그래프 스토리 ID와 일치해야 합니다");
    assertSceneParity(graph, levelId, level);
    const usedVocabulary = new Set();

    for (const [sceneId, graphScene] of Object.entries(graph.scenes)) {
      const contentScene = level.scenes[sceneId];

      for (const choice of graphScene.choices ?? []) {
        if (!contentScene.choices?.[choice.id]) {
          fail(`${levelId}.scenes.${sceneId}.choices.${choice.id}`, "선택 문구가 없습니다");
        }
      }
      const structuralChoiceIds = new Set((graphScene.choices ?? []).map(choice => choice.id));
      for (const choiceId of Object.keys(contentScene.choices ?? {})) {
        if (!structuralChoiceIds.has(choiceId)) {
          fail(`${levelId}.scenes.${sceneId}.choices.${choiceId}`, "그래프에 없는 선택 ID입니다");
        }
      }
      for (const chip of graphScene.chips ?? []) {
        if (!contentScene.chips?.[chip.id]?.label || !contentScene.chips?.[chip.id]?.response) {
          fail(`${levelId}.scenes.${sceneId}.chips.${chip.id}`, "칩 문구와 응답이 필요합니다");
        }
      }
      const structuralChipIds = new Set((graphScene.chips ?? []).map(chip => chip.id));
      for (const chipId of Object.keys(contentScene.chips ?? {})) {
        if (!structuralChipIds.has(chipId)) {
          fail(`${levelId}.scenes.${sceneId}.chips.${chipId}`, "그래프에 없는 칩 ID입니다");
        }
      }

      for (const word of contentScene.vocab ?? []) {
        usedVocabulary.add(word);
        if (!level.vocabulary[word]) fail(`${levelId}.scenes.${sceneId}.vocab`, `뜻풀이 없는 낱말 ${word}`);
      }

      for (const entry of contentScene.body ?? []) {
        if (entry && typeof entry === "object" && entry.block && !contentScene.blocks?.[entry.block]) {
          fail(`${levelId}.scenes.${sceneId}.blocks.${entry.block}`, "본문이 참조한 블록이 없습니다");
        }
      }

      for (const [blockId, selector] of Object.entries(graph.contentSelectors?.[sceneId] ?? {})) {
        const variants = contentScene.blocks?.[blockId];
        if (!variants) fail(`${levelId}.scenes.${sceneId}.blocks.${blockId}`, "조건부 블록이 없습니다");
        const keys = new Set([...Object.values(selector.cases ?? {}), selector.default].filter(Boolean));
        for (const key of keys) {
          if (!variants[key]) fail(`${levelId}.scenes.${sceneId}.blocks.${blockId}.${key}`, "selector 변형이 없습니다");
        }
      }
    }

    visitStrings(level, levelId, (text, path) => {
      for (const match of text.matchAll(/\{([^}]+)\}/g)) {
        if (!ALLOWED_TOKENS.has(match[1])) fail(path, `지원하지 않는 개인화 토큰 ${match[1]}`);
      }
    });

    for (const word of Object.keys(level.vocabulary)) {
      if (!usedVocabulary.has(word)) fail(`${levelId}.vocabulary.${word}`, "사용하는 장면이 없습니다");
    }
  }

  return true;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function schemaError(label, errors) {
  const details = (errors ?? []).map(error => `${error.instancePath || "/"} ${error.message}`).join("; ");
  return new Error(`${label}: JSON Schema 검증 실패: ${details}`);
}

export async function loadStorySources(rootDir) {
  const storyDir = path.join(rootDir, "story");
  const [graphSchema, contentSchema, graph, contentFiles] = await Promise.all([
    readJson(path.join(storyDir, "schemas/graph.schema.json")),
    readJson(path.join(storyDir, "schemas/content.schema.json")),
    readJson(path.join(storyDir, "graph.json")),
    readdir(path.join(storyDir, "content")),
  ]);

  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  const validateGraph = ajv.compile(graphSchema);
  const validateContent = ajv.compile(contentSchema);
  if (!validateGraph(graph)) throw schemaError("graph.json", validateGraph.errors);

  const levels = {};
  for (const fileName of contentFiles.filter(name => name.endsWith(".json")).sort()) {
    const content = await readJson(path.join(storyDir, "content", fileName));
    if (!validateContent(content)) throw schemaError(fileName, validateContent.errors);
    levels[content.level] = content;
  }

  const assetKeys = new Set([
    ...Object.keys(visualNovelAssets.illustrations),
    ...Object.keys(visualNovelAssets.spots),
  ]);
  const sources = { graph, levels, assetKeys, schemas: { graph: graphSchema, content: contentSchema } };
  validateStorySources(sources);
  return sources;
}

export function serializeStoryBundle({ graph, levels }) {
  const orderedLevels = Object.fromEntries(Object.entries(levels).sort(([left], [right]) => left.localeCompare(right)));
  return `// Generated by npm run story:build. Do not edit.\n`
    + `const deepFreeze = value => {\n`
    + `  if (value && typeof value === "object" && !Object.isFrozen(value)) {\n`
    + `    Object.freeze(value);\n`
    + `    Object.values(value).forEach(deepFreeze);\n`
    + `  }\n`
    + `  return value;\n`
    + `};\n\n`
    + `export const storyGraph = deepFreeze(${JSON.stringify(graph, null, 2)});\n\n`
    + `export const storyLevels = deepFreeze(${JSON.stringify(orderedLevels, null, 2)});\n`;
}

export async function assertBundleFresh(expected, bundlePath) {
  let actual = null;
  try {
    actual = await readFile(bundlePath, "utf8");
  } catch {
    // Missing and stale bundles use the same corrective action.
  }
  if (actual !== expected) throw new Error("스토리 번들이 오래됐습니다. npm run story:build를 실행하세요.");
}

export async function buildStoryBundle({ rootDir, check = false }) {
  const sources = await loadStorySources(rootDir);
  const output = serializeStoryBundle(sources);
  const bundlePath = path.join(rootDir, "src/generated/story-bundle.js");
  if (check) {
    await assertBundleFresh(output, bundlePath);
  } else {
    await mkdir(path.dirname(bundlePath), { recursive: true });
    await writeFile(bundlePath, output);
  }
  return bundlePath;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (!["build", "check"].includes(mode)) {
    throw new Error("사용법: node scripts/story-content.mjs <build|check>");
  }
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  await buildStoryBundle({ rootDir, check: mode === "check" });
}
