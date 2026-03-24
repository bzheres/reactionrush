const arena = document.getElementById("arena");
const arenaBadge = document.getElementById("arenaBadge");
const arenaTitle = document.getElementById("arenaTitle");
const arenaText = document.getElementById("arenaText");

const bestStat = document.getElementById("bestStat");
const avgStat = document.getElementById("avgStat");
const streakStat = document.getElementById("streakStat");
const rankStat = document.getElementById("rankStat");

const challengeText = document.getElementById("challengeText");
const lastResultText = document.getElementById("lastResultText");
const historyList = document.getElementById("historyList");
const historyEmpty = document.getElementById("historyEmpty");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const shareBtn = document.getElementById("shareBtn");

let state = "idle";
let timeoutId = null;
let readyTimestamp = 0;

let results = [];
let streak = 0;
let totalGames = 0;

const STORAGE_KEY = "reaction-rush-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    results = Array.isArray(data.results) ? data.results.slice(-12) : [];
    streak = typeof data.streak === "number" ? data.streak : 0;
    totalGames = typeof data.totalGames === "number" ? data.totalGames : 0;
  } catch (error) {
    console.error("Failed to load saved state", error);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      results,
      streak,
      totalGames
    })
  );
}

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getRank(time) {
  if (time == null) return "Ready";
  if (time < 150) return "Elite";
  if (time < 200) return "Fast";
  if (time < 250) return "Sharp";
  return "Average";
}

function setArena(mode, badge, title, text) {
  arena.className = `arena arena-${mode}`;
  arenaBadge.textContent = badge;
  arenaTitle.textContent = title;
  arenaText.textContent = text;
}

function updateHistory() {
  historyList.innerHTML = "";
  if (!results.length) {
    historyEmpty.style.display = "block";
    return;
  }

  historyEmpty.style.display = "none";
  const recent = [...results].reverse().slice(0, 10);

  recent.forEach((time, index) => {
    const row = document.createElement("div");
    row.className = "attempt-item";
    row.innerHTML = `<span>Attempt ${totalGames - index}</span><strong>${time} ms</strong>`;
    historyList.appendChild(row);
  });
}

function updateStats() {
  const best = results.length ? Math.min(...results) : null;
  const avg = average(results);
  const latest = results.length ? results[results.length - 1] : null;

  bestStat.textContent = best == null ? "—" : `${best} ms`;
  avgStat.textContent = avg == null ? "—" : `${avg} ms`;
  streakStat.textContent = String(streak);
  rankStat.textContent = getRank(latest);

  updateHistory();
  saveState();
}

function setChallengeMessage(latestTime) {
  const best = results.length ? Math.min(...results) : null;

  if (latestTime == null) {
    challengeText.textContent = "Lock in. Your first elite score starts now.";
    lastResultText.textContent = "No completed rounds yet.";
    return;
  }

  if (best === latestTime && results.length > 1) {
    challengeText.textContent = "New best. Stay hot and push even lower next round.";
  } else if (best != null && latestTime - best <= 10 && latestTime !== best) {
    challengeText.textContent = `${latestTime - best} ms off your best. You're right there.`;
  } else if (latestTime < 150) {
    challengeText.textContent = "Ridiculous speed. That's elite territory.";
  } else if (latestTime < 200) {
    challengeText.textContent = "Fast round. Keep the streak alive.";
  } else if (latestTime < 250) {
    challengeText.textContent = "Sharp. One cleaner click and you're flying.";
  } else {
    challengeText.textContent = "Solid start. Relax, reset, and go again.";
  }

  lastResultText.textContent = `${latestTime} ms • ${getRank(latestTime)} reflex speed`;
}

function beginRound() {
  if (timeoutId) clearTimeout(timeoutId);

  state = "waiting";
  const delay = Math.floor(Math.random() * 3200) + 1400;

  setArena(
    "waiting",
    "Hold",
    "Hold your nerve…",
    "Stay sharp. The green flash is coming, but not yet. One early click and the round is gone."
  );

  timeoutId = setTimeout(() => {
    state = "ready";
    readyTimestamp = performance.now();
    setArena(
      "ready",
      "Now",
      "NOW!",
      "Go, go, go — click instantly."
    );
  }, delay);
}

function completeRound(time) {
  state = "result";
  totalGames += 1;
  streak += 1;
  results.push(time);
  results = results.slice(-12);

  setArena(
    "result",
    getRank(time),
    `${time} ms`,
    "Nice. Tap the arena or hit “Start round” and chase an even faster time."
  );

  setChallengeMessage(time);
  updateStats();
}

function failEarly() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = null;
  state = "too-soon";
  streak = 0;

  setArena(
    "too-soon",
    "Missed",
    "Too soon!",
    "You jumped early. Reset your focus, steady your hand, and go again."
  );

  challengeText.textContent = "Streak broken. Breathe, reset, and rebuild.";
  updateStats();
}

function handleArenaAction() {
  if (state === "idle" || state === "result" || state === "too-soon") {
    beginRound();
    return;
  }

  if (state === "waiting") {
    failEarly();
    return;
  }

  if (state === "ready") {
    const time = Math.round(performance.now() - readyTimestamp);
    timeoutId = null;
    completeRound(time);
  }
}

function resetAll() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = null;

  results = [];
  streak = 0;
  totalGames = 0;
  state = "idle";

  setArena(
    "idle",
    "Ready",
    "Ready to test your reflexes?",
    "Tap anywhere to begin. Stay calm through the delay, then strike the instant the screen turns green."
  );

  setChallengeMessage(null);
  updateStats();
}

async function copyShareLink() {
  const best = results.length ? Math.min(...results) : null;
  const text = best
    ? `I scored ${best} ms on Reaction Rush. Can you beat me? ${window.location.href}`
    : `Test your reflexes on Reaction Rush: ${window.location.href}`;

  try {
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = "Copied!";
    setTimeout(() => {
      shareBtn.textContent = "Copy challenge link";
    }, 1400);
  } catch (error) {
    console.error("Clipboard failed", error);
    shareBtn.textContent = "Copy failed";
    setTimeout(() => {
      shareBtn.textContent = "Copy challenge link";
    }, 1400);
  }
}

startBtn.addEventListener("click", beginRound);
resetBtn.addEventListener("click", resetAll);
shareBtn.addEventListener("click", copyShareLink);
arena.addEventListener("click", handleArenaAction);

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "Enter") {
    event.preventDefault();
    handleArenaAction();
  }

  if (event.key.toLowerCase() === "r") {
    beginRound();
  }
});

loadState();
setArena(
  "idle",
  "Ready",
  "Ready to test your reflexes?",
  "Tap anywhere to begin. Stay calm through the delay, then strike the instant the screen turns green."
);
setChallengeMessage(results.length ? results[results.length - 1] : null);
updateStats();
