export const DEFAULT_SLOTS = Object.freeze({
  HERO: "앨리스",
  TREAT: "케이크",
  PET: "강아지",
});

const ALLOWED = {
  TREAT: ["케이크", "쿠키", "젤리", "붕어빵"],
  PET: ["강아지", "고양이", "토끼", "거북이"],
};

const PARTICLES = {
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "을/를": ["을", "를"],
  "와/과": ["과", "와"],
};

const BARE_PARTICLE_AFTER_SLOT = /\{(HERO|TREAT|PET)\}(은|는|이|가|을|를|와|과)/;

function hasFinalConsonant(word) {
  const code = word.codePointAt(word.length - 1);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

export function selectParticle(word, pair) {
  const particles = PARTICLES[pair];
  return particles[hasFinalConsonant(word) ? 0 : 1];
}

export function normalizeSlots(input = {}) {
  const hero = typeof input.HERO === "string" && /^[가-힣]{2,6}$/.test(input.HERO.trim())
    ? input.HERO.trim()
    : DEFAULT_SLOTS.HERO;
  return Object.fromEntries(Object.entries(DEFAULT_SLOTS).map(([key, fallback]) => [
    key,
    key === "HERO" ? hero : ALLOWED[key].includes(input[key]) ? input[key] : fallback,
  ]));
}

export function renderTemplate(template, input) {
  const invalidParticle = String(template).match(BARE_PARTICLE_AFTER_SLOT);
  if (invalidParticle) {
    throw new Error(`${invalidParticle[0]} 대신 지원되는 조사 토큰을 사용하세요.`);
  }
  const slots = normalizeSlots(input);
  return String(template).replace(/\{(HERO|TREAT|PET)\}(?:\{(이\/가|은\/는|을\/를|와\/과)\})?/g,
    (_, key, pair) => slots[key] + (pair ? selectParticle(slots[key], pair) : ""));
}
