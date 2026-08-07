export function findPart(root, name) {
  return root?.querySelector?.(`[data-p="${name}"]`) ?? null;
}

export function setExpression(root, expression) {
  const faces = Array.from(root?.querySelectorAll?.("[data-face]") ?? []);
  const selected = faces.find(face => face.dataset.face === expression);
  if (!selected) return false;

  faces.forEach(face => {
    face.hidden = face !== selected;
  });
  return true;
}

export function clearMotion(target) {
  if (!target) return;
  target.style.transform = "";
  target.style.opacity = "";
}

