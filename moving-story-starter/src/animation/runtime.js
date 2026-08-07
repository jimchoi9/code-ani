export function deriveMotionEnabled({ requested, reduced, hidden }) {
  return Boolean(requested && !reduced && !hidden);
}

export function createMotionRuntime({
  documentRef = document,
  motionQuery = matchMedia("(prefers-reduced-motion: reduce)"),
} = {}) {
  let requested = true;
  const subscribers = new Set();

  const isEnabled = () => deriveMotionEnabled({
    requested,
    reduced: motionQuery.matches,
    hidden: documentRef.hidden,
  });

  function notify() {
    const enabled = isEnabled();
    subscribers.forEach(subscriber => subscriber(enabled));
  }

  function setRequested(nextRequested) {
    requested = Boolean(nextRequested);
    notify();
  }

  function subscribe(subscriber) {
    subscribers.add(subscriber);
    subscriber(isEnabled());
    return () => subscribers.delete(subscriber);
  }

  documentRef.addEventListener("visibilitychange", notify);
  motionQuery.addEventListener("change", notify);

  return {
    isEnabled,
    setRequested,
    subscribe,
    destroy() {
      documentRef.removeEventListener("visibilitychange", notify);
      motionQuery.removeEventListener("change", notify);
      subscribers.clear();
    },
  };
}

