import { renderTemplate } from "../personalization.js";
import { getScene } from "../story-data.js";
import { escapeHtml, renderArtPlaceholder } from "../ui.js";

const SLOT_OPTIONS = {
  TREAT: ["케이크", "쿠키", "젤리", "붕어빵"],
  PET: ["강아지", "고양이", "토끼", "거북이"],
};

const progressByScene = Object.freeze({
  S00: 1,
  S01: 2,
  S02: 2,
  A1: 3,
  A2: 3,
  A3: 3,
  B1: 3,
  B2: 3,
  B3: 3,
  C1: 5,
  C2: 6,
  E1: 7,
  E2: 7,
  E3: 7,
  E4: 7,
  E5: 7,
  E6: 7,
});

const speakers = Object.freeze({
  rabbit: { id: "rabbit", label: "하얀 토끼" },
  cat: { id: "cat", label: "체셔 고양이" },
  hatter: { id: "hatter", label: "모자장수" },
  caterpillar: { id: "caterpillar", label: "애벌레" },
  narrator: { id: "narrator", label: "서술자" },
  ending: { id: "ending", label: "결말" },
});

const storyFragments = Object.freeze({
  E1: { name: "호기심의 조각", tone: "curiosity", mark: "?" },
  E2: { name: "신중함의 조각", tone: "prudence", mark: "◌" },
  E3: { name: "즐거움의 조각", tone: "joy", mark: "♪" },
  E4: { name: "침착함의 조각", tone: "composure", mark: "◇" },
  E5: { name: "자신감의 조각", tone: "confidence", mark: "★" },
  E6: { name: "친화력의 조각", tone: "warmth", mark: "♥" },
});

const endingTones = Object.freeze(Object.fromEntries(
  Object.entries(storyFragments).map(([id, fragment]) => [id, fragment.tone]),
));

const speakerByScene = Object.freeze({
  S00: "rabbit",
  A1: "cat", B1: "cat", C1: "cat",
  A2: "caterpillar", B2: "caterpillar",
  A3: "hatter", B3: "hatter",
});

const onboardingQuestions = Object.freeze({
  name: { prompt: "늦었다, 늦었어! 그런데 넌 누구니? 이름을 알려 줘.", placeholder: "내 이름 쓰기", suggestions: [] },
  friend: { prompt: "반가워! 함께 모험할 친구는 누구야?", placeholder: "함께 갈 친구 쓰기", suggestions: ["강아지", "고양이", "토끼", "거북이"] },
  snack: { prompt: "마지막 질문이야. 모험 가방에 어떤 간식을 넣을까?", placeholder: "먹고 싶은 간식 쓰기", suggestions: ["케이크", "쿠키", "젤리", "붕어빵"] },
});

function personalize(value, slots = {}) {
  return renderTemplate(String(value ?? ""), slots);
}

function renderParagraphs(value, slots) {
  return personalize(value, slots)
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function renderTrail(progress) {
  return `<div class="vn-trail" aria-label="진행 ${progress}/7">${Array.from(
    { length: 7 },
    (_, index) => `<span class="vn-trail-card${index < progress ? " is-complete" : ""}" aria-hidden="true"></span>`,
  ).join("")}</div>`;
}

function renderGameHud(session = null, slots = {}) {
  const hero = personalize("{HERO}", slots) || "앨리스";
  const level = Math.max(1, session?.path?.length ?? 1);
  const vocabCount = session?.vocabTapped?.length ?? 0;
  const endingCount = session?.endingsSeen?.length ?? 0;
  return `<header class="vn-game-hud">
    <div class="vn-avatar" aria-hidden="true">A</div>
    <div class="vn-player"><strong>${escapeHtml(hero)}</strong><span>STORY Lv. ${escapeHtml(level)}</span></div>
    <div class="vn-hud-stat"><span>낱말</span><strong>${escapeHtml(vocabCount)}</strong></div>
    <div class="vn-hud-stat"><span>결말</span><strong>${escapeHtml(endingCount)}/6</strong></div>
  </header>`;
}

function renderTitlePlaque(title, subtitle) {
  return `<div class="vn-title-plaque"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>`;
}

function renderGameFooter(session = null, progress = 0) {
  const vocabCount = session?.vocabTapped?.length ?? 0;
  const endingCount = session?.endingsSeen?.length ?? 0;
  return `<footer class="vn-game-footer" aria-label="모험 기록">
    <span>진행 <strong>${escapeHtml(progress)}/7</strong></span>
    <span>낱말 <strong>${escapeHtml(vocabCount)}</strong></span>
    <span>결말 <strong>${escapeHtml(endingCount)}/6</strong></span>
  </footer>`;
}

function renderStoryReward(reward) {
  const fragment = storyFragments[reward?.endingId];
  if (!fragment) return "";
  const particles = Array.from({ length: 12 }, (_, index) => (
    `<i class="vn-reward-particle" data-particle="${index}" aria-hidden="true"></i>`
  )).join("");
  return `<section class="vn-reward-overlay" data-reward-tone="${fragment.tone}" role="dialog" aria-modal="true" aria-labelledby="vn-reward-title">
    <div class="vn-reward-rays" aria-hidden="true"></div>
    <div class="vn-reward-particles">${particles}</div>
    <div class="vn-reward-impact" aria-hidden="true"></div>
    <div class="vn-reward-card">
      <p class="vn-reward-kicker">새로운 보물을 발견했어요</p>
      <span class="vn-reward-mark" aria-hidden="true">${fragment.mark}</span>
      <h2 id="vn-reward-title">${fragment.name}</h2>
      <p>이야기 조각 <strong>${escapeHtml(reward.count)}/6</strong></p>
    </div>
    <p class="vn-reward-hint">화면을 누르면 연출을 건너뛸 수 있어요</p>
    <button type="button" data-action="dismiss-reward">보물 확인하기</button>
  </section>`;
}

function renderVocabularyWords(words = []) {
  if (!words.length) return "";

  return `<aside class="vn-vocabulary" aria-label="낱말 살펴보기"><h2>낱말 살펴보기</h2><ul>${words
    .map(word => `<li><button type="button" data-action="vocab" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button></li>`)
    .join("")}</ul></aside>`;
}

function renderChoice(choice, slots) {
  return `<button class="vn-choice" type="button" data-action="choose" data-choice-id="${escapeHtml(choice.id ?? "")}" data-next-scene="${escapeHtml(choice.nextSceneId)}">${escapeHtml(personalize(choice.label, slots))}</button>`;
}

function renderChip(chip, slots) {
  const label = personalize(chip.label, slots);
  const response = personalize(chip.response, slots);
  return `<button class="vn-choice" type="button" data-action="choose-chip" data-next-scene="${escapeHtml(chip.nextSceneId)}" data-chip-label="${escapeHtml(label)}" data-chip-response="${escapeHtml(response)}">${escapeHtml(label)}</button>`;
}

function renderSceneActions(scene, slots) {
  if (scene.type === "chip") {
    const prompt = scene.prompt
      ? `<p class="vn-prompt">${escapeHtml(personalize(scene.prompt, slots))}</p>`
      : "";
    return `${prompt}<div class="vn-actions" aria-label="대답 고르기">${(scene.chips ?? []).map(chip => renderChip(chip, slots)).join("")}</div>`;
  }

  const choices = (scene.choices ?? []).map(choice => renderChoice(choice, slots)).join("");
  if (choices) return `<div class="vn-actions" aria-label="다음 장면 고르기">${choices}</div>`;
  if (!scene.nextSceneId) return "";

  return `<div class="vn-actions" aria-label="다음 장면"><button class="vn-choice" type="button" data-action="continue" data-next-scene="${escapeHtml(scene.nextSceneId)}">계속 읽기</button></div>`;
}

function renderStage(scene, dialogue, progress, endingTone = "", session = null, context = {}) {
  const speaker = getVisualNovelSpeaker(scene);
  const toneAttribute = endingTone ? ` data-ending-tone="${escapeHtml(endingTone)}"` : "";
  const backdrop = renderArtPlaceholder(scene.art, "vn-art-placeholder");

  const slots = session?.slots ?? {};
  return `<main class="vn-shell" data-ui="visual-novel"${toneAttribute}>
    <div class="vn-game-frame">
      ${renderGameHud(session, slots)}
      ${renderTitlePlaque(personalize(scene.title, slots), scene.type === "ending" ? "모험의 결말" : "이상한 나라의 모험")}
      <section class="vn-stage">
        <div class="vn-art-frame">${backdrop}</div>
        <article class="vn-dialogue">
        <p class="vn-nameplate vn-nameplate--${speaker.id}">${escapeHtml(speaker.label)}</p>
        ${dialogue}
        ${renderTrail(progress)}
        </article>
      </section>
      ${renderGameFooter(session, progress)}
    </div>
    ${renderStoryReward(context.storyReward)}
  </main>`;
}

export function playStoryFragmentReward(root, windowRef = globalThis.window) {
  const overlay = root?.querySelector?.(".vn-reward-overlay");
  if (!overlay) return [];
  const reducedMotion = windowRef?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const elements = {
    rays: overlay.querySelector(".vn-reward-rays"),
    card: overlay.querySelector(".vn-reward-card"),
    impact: overlay.querySelector(".vn-reward-impact"),
    copy: [...overlay.querySelectorAll(".vn-reward-kicker, .vn-reward-card h2, .vn-reward-card p, .vn-reward-hint, button")],
    particles: [...overlay.querySelectorAll(".vn-reward-particle")],
  };

  if (reducedMotion) {
    overlay.classList.add("is-ready");
    return [];
  }

  if (typeof overlay.animate !== "function") {
    const finishCssFallback = () => {
      overlay.classList.remove("use-css-motion");
      overlay.classList.add("is-ready");
      overlay.querySelector('[data-action="dismiss-reward"]')?.focus({ preventScroll: true });
    };
    overlay.classList.add("use-css-motion");
    overlay.addEventListener("click", event => {
      if (!event.target.closest("[data-action]")) finishCssFallback();
    }, { once: true });
    windowRef?.setTimeout?.(finishCssFallback, 2450);
    return [];
  }

  overlay.classList.add("is-animating");
  const animations = [
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: "both", easing: "ease-out" }),
    elements.rays.animate(
      [{ opacity: 0, transform: "scale(.3) rotate(-25deg)" }, { opacity: .9, transform: "scale(1) rotate(18deg)" }],
      { delay: 180, duration: 1450, fill: "both", easing: "cubic-bezier(.16,.8,.22,1)" },
    ),
    elements.card.animate(
      [
        { opacity: 0, transform: "translateY(90px) scale(.32) rotate(-8deg)" },
        { opacity: 1, transform: "translateY(-14px) scale(1.08) rotate(2deg)", offset: .72 },
        { opacity: 1, transform: "translateY(0) scale(1) rotate(0)" },
      ],
      { delay: 560, duration: 1120, fill: "both", easing: "cubic-bezier(.18,.9,.22,1.18)" },
    ),
    elements.impact.animate(
      [{ opacity: 0, transform: "scale(.2)" }, { opacity: .9, transform: "scale(1.1)", offset: .45 }, { opacity: 0, transform: "scale(1.65)" }],
      { delay: 1280, duration: 620, fill: "both", easing: "ease-out" },
    ),
    ...elements.copy.map((element, index) => element.animate(
      [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }],
      { delay: 1500 + index * 65, duration: 360, fill: "both", easing: "ease-out" },
    )),
    ...elements.particles.map((particle, index) => {
      const angle = (Math.PI * 2 * index) / elements.particles.length;
      const distance = 145 + (index % 3) * 34;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      return particle.animate(
        [
          { opacity: 0, transform: `translate(${x}px, ${y}px) scale(.2) rotate(0deg)` },
          { opacity: 1, offset: .42 },
          { opacity: .9, transform: "translate(0, 0) scale(1) rotate(240deg)" },
          { opacity: 0, transform: "translate(0, 0) scale(.1) rotate(320deg)" },
        ],
        { delay: 220 + index * 35, duration: 1120, fill: "both", easing: "cubic-bezier(.2,.75,.3,1)" },
      );
    }),
  ].filter(Boolean);

  const finish = () => {
    for (const animation of animations) {
      try { animation.finish(); } catch { /* A detached overlay needs no final frame. */ }
    }
    overlay.classList.add("is-ready");
    overlay.querySelector('[data-action="dismiss-reward"]')?.focus({ preventScroll: true });
  };
  overlay.addEventListener("click", event => {
    if (!event.target.closest("[data-action]")) finish();
  }, { once: true });
  Promise.allSettled(animations.map(animation => animation.finished)).then(finish);
  return animations;
}

export function getVisualNovelProgress(session, scene) {
  void session;
  if (!scene || scene.type === "setup") return 0;
  if (scene.type === "chip-response" || scene.screen === "chip-response") return 4;
  return progressByScene[scene.id] ?? 0;
}

export function getVisualNovelSpeaker(scene) {
  if (scene?.type === "ending") return speakers.ending;
  const character = speakerByScene[scene?.id];
  return speakers[character] ?? speakers.narrator;
}

export function renderSetup(slots = {}, context = {}) {
  if (context.testMode) {
    return `<main class="vn-shell vn-setup vn-code-entry" data-ui="visual-novel">
      <div class="vn-game-frame">
        ${renderGameHud()}
        ${renderTitlePlaque("모험 입장", "시계토끼가 기다리고 있어요")}
        <section class="vn-setup-panel">
          <form data-action="start-onboarding">
            <label for="participant-id">참가자 코드</label>
            <input id="participant-id" class="vn-participant-input" type="text" name="PARTICIPANT_ID" value="${escapeHtml(context.participantId ?? "")}" maxlength="12" pattern="[A-Za-z0-9_-]+" autocomplete="off" autocapitalize="characters" required data-focus-target>
            <button class="vn-choice" type="submit">시계토끼 만나기</button>
          </form>
          ${renderTrail(0)}
        </section>
        ${renderGameFooter(null, 0)}
      </div>
    </main>`;
  }
  const hero = personalize("{HERO}", slots);
  const groups = Object.entries(SLOT_OPTIONS).map(([slot, options]) => `
    <fieldset data-slot="${slot}">
      <legend>${escapeHtml({ TREAT: "간식", PET: "친구" }[slot])}</legend>
      ${options.map(option => `<label><input type="radio" name="${slot}" value="${escapeHtml(option)}" data-action="set-slot" data-slot="${slot}"${personalize(`{${slot}}`, slots) === option ? " checked" : ""}>${escapeHtml(option)}</label>`).join("")}
    </fieldset>`).join("");

  return `<main class="vn-shell vn-setup" data-ui="visual-novel">
    <div class="vn-game-frame">
      ${renderGameHud(null, slots)}
      ${renderTitlePlaque("사용자 정보 입력", "앨리스의 모험을 준비해 주세요")}
      <section class="vn-setup-panel">
        <form data-action="start">
          ${context.testMode ? `<label for="participant-id">참가자 코드</label>
          <input id="participant-id" class="vn-participant-input" type="text" name="PARTICIPANT_ID" value="${escapeHtml(context.participantId ?? "")}" maxlength="12" pattern="[A-Za-z0-9_-]+" autocomplete="off" autocapitalize="characters" required data-focus-target>` : ""}
          <label for="hero-name">이름</label>
          <input id="hero-name" type="text" name="HERO" value="${escapeHtml(hero)}" maxlength="6" autocomplete="off" inputmode="text" data-action="set-name">
          ${groups}
          <button class="vn-choice" type="submit" data-action="start">이야기 시작</button>
        </form>
        ${renderTrail(0)}
      </section>
      ${renderGameFooter(null, 0)}
    </div>
  </main>`;
}

export function renderOnboarding(context = {}) {
  const onboarding = context.onboarding ?? { step: "name", answers: {} };
  const answers = onboarding.answers ?? {};
  const turns = [{ role: "rabbit", text: onboardingQuestions.name.prompt }];
  if (answers.HERO) turns.push({ role: "child", text: answers.HERO });
  if (answers.HERO && onboarding.step !== "name") turns.push({ role: "rabbit", text: onboardingQuestions.friend.prompt });
  if (answers.PET) turns.push({ role: "child", text: answers.PET });
  if (answers.PET && ["snack", "confirm"].includes(onboarding.step)) turns.push({ role: "rabbit", text: onboardingQuestions.snack.prompt });
  if (answers.TREAT) turns.push({ role: "child", text: answers.TREAT });

  if (context.onboardingTyping) {
    while (turns.at(-1)?.role === "rabbit") turns.pop();
  }

  const messages = turns.map((turn, index) => `<div class="vn-chat-row is-${turn.role}${index === turns.length - 1 ? " is-latest" : ""}">
    ${turn.role === "rabbit" ? `<span class="vn-chat-avatar" aria-hidden="true">토</span>` : ""}
    <p>${escapeHtml(turn.text)}</p>
  </div>`).join("");

  let composer = "";
  if (context.onboardingTyping) {
    composer = `<div class="vn-chat-typing" role="status" aria-label="시계토끼가 답장을 쓰는 중"><span></span><span></span><span></span></div>`;
  } else if (onboarding.step === "confirm") {
    composer = `<div class="vn-chat-confirm">
      <p><strong>${escapeHtml(answers.HERO)}</strong>, <strong>${escapeHtml(answers.PET)}</strong>와 함께 <strong>${escapeHtml(answers.TREAT)}</strong>을 챙겨 가는 거구나!</p>
      <button class="vn-choice" type="button" data-action="onboarding-confirm" data-focus-target>이대로 출발!</button>
    </div>`;
  } else {
    const question = onboardingQuestions[onboarding.step] ?? onboardingQuestions.name;
    const suggestions = question.suggestions.length
      ? `<div class="vn-chat-suggestions" aria-label="추천 답장">${question.suggestions.map(value => `<button type="button" data-action="onboarding-suggestion" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div>`
      : "";
    composer = `${suggestions}<form class="vn-chat-composer" data-action="onboarding-answer">
      <label class="sr-only" for="onboarding-answer">${escapeHtml(question.placeholder)}</label>
      <input id="onboarding-answer" name="ANSWER" maxlength="${onboarding.step === "name" ? "6" : "12"}" placeholder="${escapeHtml(question.placeholder)}" autocomplete="off" required data-focus-target>
      <button type="submit" aria-label="답장 보내기">➜</button>
    </form>`;
  }

  return `<main class="vn-shell vn-onboarding" data-ui="visual-novel">
    <div class="vn-game-frame">
      <header class="vn-chat-header"><span class="vn-chat-avatar" aria-hidden="true">토</span><div><strong>시계토끼</strong><span>지금 대화 중</span></div></header>
      <section class="vn-chat-log" aria-live="polite">${messages}${context.onboardingTyping ? composer : ""}</section>
      <section class="vn-chat-input">${context.onboardingTyping ? "" : composer}</section>
    </div>
  </main>`;
}

export function renderScene(scene, session, feedback = null, context = {}) {
  const slots = session?.slots ?? {};
  const feedbackMessage = feedback === null || feedback === undefined
    ? ""
    : `<p class="vn-feedback" role="status">네가 고른 길: ${escapeHtml(personalize(feedback, slots))}</p>`;
  const dialogue = `<h1>${escapeHtml(personalize(scene.title, slots))}</h1>
    ${feedbackMessage}
    <div class="vn-copy">${renderParagraphs(scene.body, slots)}</div>
    ${renderVocabularyWords(scene.vocab)}
    ${renderSceneActions(scene, slots)}`;

  return renderStage(scene, dialogue, getVisualNovelProgress(session, scene), "", session, context);
}

export function renderChipResponse(state, context = {}) {
  const scene = getScene(state?.sceneId);
  if (!scene) return renderRecovery();

  const response = state?.chipResponse ?? {};
  const dialogue = `<p class="vn-kicker">네가 고른 말</p>
    <h1>${escapeHtml(response.label ?? "")}</h1>
    <p class="vn-feedback" role="status">${escapeHtml(response.response ?? "")}</p>
    <button class="vn-choice" type="button" data-action="continue-chip">이야기 이어 보기</button>`;

  return renderStage(scene, dialogue, 4, "", state.session, context);
}

export function renderEnding(scene, session, context = {}) {
  const slots = session?.slots ?? {};
  const selectedChip = (session?.chipChoices ?? []).find(choice => choice.sceneId === scene.sourceSceneId);
  const recall = selectedChip
    ? `<p class="vn-feedback">${escapeHtml(personalize(scene.choiceRecall ?? "네가 고른 말", slots))}: ${escapeHtml(personalize(selectedChip.label, slots))}</p>`
    : "";
  const endingCount = session?.endingsSeen?.length ?? 0;
  const endingActions = context.testMode
    ? `<div class="vn-test-ending-actions">
        <button class="vn-choice" type="button" data-action="other-ending">다른 결말도 찾아볼래!</button>
        <button class="vn-choice" type="button" data-action="finish-adventure">오늘 모험 마치기</button>
      </div>`
    : `<button class="vn-choice" type="button" data-action="restart">다시 시작</button>`;
  const dialogue = `<p class="vn-kicker">이야기의 끝</p>
    <h1>${escapeHtml(personalize(scene.title, slots))}</h1>
    <div class="vn-copy">${renderParagraphs(scene.body, slots)}</div>
    ${recall}
    <p class="vn-trait">너의 이야기 조각: ${escapeHtml(personalize(scene.trait, slots))}</p>
    <p class="vn-ending-progress" aria-label="결말 수집 상태">${escapeHtml(endingCount)}/6</p>
    ${renderVocabularyWords(scene.vocab)}
    ${endingActions}`;

  return renderStage(scene, dialogue, getVisualNovelProgress(session, scene), endingTones[scene.id], session, context);
}

export function renderComplete(session, endingScene, context = {}) {
  const slots = session?.slots ?? {};
  const endings = session?.endingsSeen ?? [];
  const fragments = endings.map(id => storyFragments[id]).filter(Boolean);
  const fragmentList = fragments.length
    ? `<ul class="vn-complete-fragments">${fragments.map(fragment => `<li><span aria-hidden="true">${fragment.mark}</span>${escapeHtml(fragment.name)}</li>`).join("")}</ul>`
    : `<p class="vn-complete-empty">첫 번째 이야기 조각을 만났어요.</p>`;
  const facilitator = context.testCompleted
    ? `<div class="vn-facilitator-status" role="status">
        <strong>테스트 기록을 저장했어요</strong>
        <p>다음 참가자를 준비할 수 있습니다.</p>
        <button class="vn-choice" type="button" data-action="new-participant">새 참가자 시작</button>
      </div>`
    : `<div class="vn-facilitator-actions">
        <button class="vn-choice" type="button" data-action="complete-test">기록 저장하고 테스트 완료</button>
        <button class="vn-text-action" type="button" data-action="back-to-ending">이야기로 돌아가기</button>
      </div>`;
  const dialogue = `<p class="vn-kicker">오늘의 모험</p>
    <h1>모험 완료!</h1>
    <p class="vn-complete-message">${escapeHtml(personalize("{HERO}{은/는} 오늘 멋진 선택으로 이야기를 완성했어요.", slots))}</p>
    ${fragmentList}
    <p class="vn-ending-progress">만난 결말 <strong>${escapeHtml(endings.length)}/6</strong></p>
    <section class="vn-facilitator-panel" aria-label="진행자용 테스트 도구">
      <p class="vn-facilitator-label">진행자용</p>
      ${facilitator}
    </section>`;

  const completeScene = { ...endingScene, title: "오늘의 모험" };
  return renderStage(completeScene, dialogue, 7, endingTones[endingScene?.id], session, context);
}

export function renderRecovery(context = {}) {
  return `<main class="vn-shell" data-ui="visual-novel">
    <div class="vn-game-frame">
      ${renderGameHud()}
      ${renderTitlePlaque("모험이 멈췄어요", "이야기를 다시 불러오지 못했어요")}
      <section class="vn-recovery" role="alert" aria-labelledby="recovery-title">
        <h1 id="recovery-title">이야기를 이어 갈 수 없어요</h1>
        <p>처음 장면부터 다시 시작해 볼까요?</p>
        <button class="vn-choice" type="button" data-action="restart">다시 시작</button>
      </section>
      ${renderGameFooter()}
    </div>
  </main>`;
}

export function renderVocabularyPanel(word, definition) {
  if (typeof definition !== "string" || definition.length === 0) return "";

  return `<section class="vn-vocabulary-panel" role="region" aria-labelledby="vocabulary-word">
    <h2 id="vocabulary-word">${escapeHtml(word)}</h2>
    <p>${escapeHtml(definition)}</p>
    <button class="vn-choice" type="button" data-action="close-vocabulary">닫기</button>
  </section>`;
}

export function renderTestTools(context = {}) {
  if (!context.testMode) return "";
  return `<details class="vn-test-tools">
    <summary>TEST</summary>
    <div>
      <p>참가자 <strong>${escapeHtml(context.participantId || "미등록")}</strong> · 이벤트 ${escapeHtml(context.eventCount ?? 0)}개</p>
      <button type="button" data-action="test-download"${context.participantId ? "" : " disabled"}>JSON 다운로드</button>
      <button type="button" data-action="test-reset">새 테스트 시작</button>
    </div>
  </details>`;
}

export const visualNovelRenderer = Object.freeze({
  id: "visual-novel",
  renderSetup,
  renderOnboarding,
  renderScene,
  renderChipResponse,
  renderEnding,
  renderComplete,
  renderRecovery,
  renderVocabularyPanel,
  renderTestTools,
  playReward: playStoryFragmentReward,
});
