const vocabulary = {
  "황급히": "아주 급하게, 서둘러서",
  "먹음직스러운": "보기에 맛있어 보이는",
  "낯선": "한 번도 본 적 없어 익숙하지 않은",
  "흐드러지게": "아주 탐스럽고 활짝",
  "서서히": "천천히, 조금씩",
  "의미심장하게": "속에 깊은 뜻이 담긴 듯한 느낌으로",
  "엄중하게": "아주 엄격하고 진지하게",
  "어리둥절했어요": "무슨 일인지 몰라 정신이 얼떨떨했어요",
  "장식되어": "보기 좋게 꾸며져",
  "훤히": "아주 밝고 뚜렷하게, 막힘없이",
  "덤덤하게": "특별히 놀라거나 흔들리지 않고 차분하게",
  "굳이": "일부러 애써서",
  "두둥실": "가볍게 떠오르는 모양",
  "덩달아": "남이 하는 대로 따라서",
  "성큼성큼": "걸음을 크고 시원하게 내딛는 모양",
};

export function getVocabulary(word) {
  return vocabulary[word] ?? null;
}

export function recordVocabulary(session, word) {
  if (!getVocabulary(word)) return session;
  return {
    ...session,
    vocabTapped: session.vocabTapped.includes(word)
      ? [...session.vocabTapped]
      : [...session.vocabTapped, word],
  };
}
