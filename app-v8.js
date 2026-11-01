(() => {
  "use strict";

  const STORE = "multiplication-practice-records-v1";
  const LEVELS = {
    1: { name: "Student", count: 20, seconds: 600, text: "Student: 20 questions with a relaxed 10-minute timer." },
    2: { name: "Scholar", count: 30, seconds: 120, text: "Scholar: 30 questions in 2 minutes. Finish accurately before time runs out." },
    3: { name: "Prodigy", count: null, seconds: 120, text: "Prodigy: answer as many questions as you can in 2 minutes." },
  };
  const DEFAULTS = { level: 1, range: 10, focus: "all" };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    start: $("#start-screen"), quiz: $("#quiz-screen"), results: $("#results-screen"),
    startButton: $("#start-button"), retryButton: $("#retry-button"), timer: $("#timer"),
    roundLabel: $("#round-label"), records: $("#records"), playerName: $("#player-name"),
    playerList: $("#player-list"), playerError: $("#player-error"), level: $("#level-select"),
    range: $("#range-select"), focus: $("#focus-select"), sound: $("#sound-toggle"), settingsSummary: $("#settings-summary"),
    levelDescription: $("#level-description"), leaderboard: $("#leaderboard-list"),
    leaderboardRule: $("#leaderboard-rule"), stripAnswered: $("#strip-answered"),
    stripRemaining: $("#strip-remaining"), stripReview: $("#strip-review"),
    progressText: $("#progress-text"), answeredText: $("#answered-text"), progressBar: $("#progress-bar"),
    questionArea: $(".question-area"), question: $("#question"), factorTop: $("#factor-top"), factorBottom: $("#factor-bottom"),
    choices: $("#choices"), quizNote: $("#quiz-note"), resultHeading: $("#result-heading"),
    score: $("#score"), correctCount: $("#correct-count"), elapsedTime: $("#elapsed-time"),
    answerFeedback: $("#answer-feedback"), resultMessage: $("#result-message"), corrections: $("#corrections"),
  };

  let questions = [], answers = [], index = 0, startedAt = 0, timerId = null, unlockId = null;
  let reviewCount = 0, locked = false, activePlayer = "", activeSettings = { ...DEFAULTS };
  let audioContext = null;

  const emptyRecords = () => ({ bestScore: 0, fastestPerfect: null, bestCorrect: 0, missedFacts: {}, roundsCompleted: 0 });
  function cleanRecords(value) {
    const record = value && typeof value === "object" ? value : {};
    return {
      bestScore: Number.isFinite(record.bestScore) ? record.bestScore : 0,
      fastestPerfect: Number.isFinite(record.fastestPerfect) ? record.fastestPerfect : null,
      bestCorrect: Number.isFinite(record.bestCorrect) ? record.bestCorrect : 0,
      missedFacts: record.missedFacts && typeof record.missedFacts === "object" ? record.missedFacts : {},
      roundsCompleted: Number.isFinite(record.roundsCompleted) ? record.roundsCompleted : 0,
    };
  }
  function cleanSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const level = [1, 2, 3].includes(Number(source.level)) ? Number(source.level) : 1;
    const range = Number(source.range) === 12 ? 12 : 10;
    const candidate = source.focus === "all" ? "all" : Number(source.focus);
    const focus = candidate === "all" || (Number.isInteger(candidate) && candidate >= 0 && candidate <= range) ? String(candidate) : "all";
    return { level, range, focus };
  }
  const modeKey = (settings) => `level${settings.level}-range${settings.range}-${settings.focus === "all" ? "mixed" : `table${settings.focus}`}`;
  const cleanName = (value) => value.trim().replace(/\s+/g, " ").slice(0, 16);
  const playerKey = (value) => cleanName(value).toLocaleLowerCase();
  function cleanPlayer(value, fallback) {
    const displayName = cleanName((value && value.displayName) || fallback);
    const recordsByMode = {};
    if (value && value.recordsByMode && typeof value.recordsByMode === "object") {
      Object.entries(value.recordsByMode).forEach(([key, records]) => { recordsByMode[key] = cleanRecords(records); });
    } else if (value && typeof value === "object") {
      recordsByMode["level1-range12-mixed"] = cleanRecords(value);
    }
    return { displayName, recordsByMode };
  }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE)) || {};
      const players = {};
      Object.entries(saved.players || {}).forEach(([key, value]) => {
        const player = cleanPlayer(value, key);
        if (player.displayName) players[playerKey(player.displayName)] = player;
      });
      const oldFields = ["bestScore", "fastestPerfect", "missedFacts", "roundsCompleted"];
      return {
        version: 4, players, currentPlayer: typeof saved.currentPlayer === "string" ? saved.currentPlayer : "",
        settings: cleanSettings(saved.settings),
        sound: saved.sound === true,
        legacy: saved.legacy || (oldFields.some((field) => Object.prototype.hasOwnProperty.call(saved, field)) ? cleanRecords(saved) : null),
      };
    } catch { return { version: 4, players: {}, currentPlayer: "", settings: { ...DEFAULTS }, sound: false, legacy: null }; }
  }
  const save = (state) => localStorage.setItem(STORE, JSON.stringify(state));
  const settingsFromUI = () => cleanSettings({ level: el.level.value, range: el.range.value, focus: el.focus.value });
  function recordsFor(player, settings) {
    const profile = load().players[player];
    return profile && profile.recordsByMode && profile.recordsByMode[modeKey(settings)] || emptyRecords();
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function choicesFor(correct) {
    const choices = new Set([correct]);
    for (const offset of shuffle([-12, -10, -8, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10, 12])) {
      if (correct + offset >= 0) choices.add(correct + offset);
      if (choices.size === 3) break;
    }
    return shuffle([...choices]);
  }
  const factKey = (left, right) => `${Math.min(left, right)}x${Math.max(left, right)}`;
  function parseFact(key) {
    const [left, right] = key.split("x").map(Number);
    return Number.isInteger(left) && Number.isInteger(right) && left >= 0 && right <= 12 ? { left, right } : null;
  }
  function factPool(settings) {
    const pool = [];
    if (settings.focus !== "all") {
      for (let other = 0; other <= settings.range; other += 1) pool.push({ left: Number(settings.focus), right: other });
    } else {
      for (let left = 0; left <= settings.range; left += 1) {
        for (let right = left; right <= settings.range; right += 1) pool.push({ left, right });
      }
    }
    return pool;
  }
  function matches(fact, settings) {
    return fact.left <= settings.range && fact.right <= settings.range
      && (settings.focus === "all" || fact.left === Number(settings.focus) || fact.right === Number(settings.focus));
  }
  function makeRound(settings) {
    const desired = LEVELS[settings.level].count || 500;
    const records = recordsFor(activePlayer, settings);
    const review = Object.entries(records.missedFacts).filter(([, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1]).map(([key]) => parseFact(key)).filter((fact) => fact && matches(fact, settings)).slice(0, 8);
    reviewCount = review.length;
    const pool = factPool(settings), facts = [...review];
    const reviewKeys = new Set(review.map((fact) => factKey(fact.left, fact.right)));
    facts.push(...shuffle(pool).filter((fact) => !reviewKeys.has(factKey(fact.left, fact.right))).slice(0, desired - facts.length));
    while (facts.length < desired) facts.push(...shuffle(pool).slice(0, Math.min(pool.length, desired - facts.length)));
    return facts.map((fact) => {
      const swap = fact.left !== fact.right && Math.random() < 0.5;
      const left = swap ? fact.right : fact.left, right = swap ? fact.left : fact.right;
      return { left, right, correct: left * right, choices: choicesFor(left * right) };
    });
  }

  function formatTime(seconds) { return `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`; }
  function settingsName(settings) { return `${LEVELS[settings.level].name} · 0–${settings.range} · ${settings.focus === "all" ? "Mixed" : `×${settings.focus} only`}`; }
  function fillFocus(range, selected = "all") {
    el.focus.replaceChildren();
    const all = document.createElement("option"); all.value = "all"; all.textContent = "All tables · Mixed"; el.focus.append(all);
    for (let number = 0; number <= range; number += 1) {
      const option = document.createElement("option"); option.value = number; option.textContent = `×${number} table only`; el.focus.append(option);
    }
    el.focus.value = Number(selected) <= range ? selected : "all";
  }
  function showSettings() {
    const settings = settingsFromUI(), level = LEVELS[settings.level];
    el.settingsSummary.textContent = settingsName(settings);
    el.levelDescription.textContent = level.text;
    el.roundLabel.textContent = settings.level === 1 ? "Student · 20 questions · 10 minutes"
      : settings.level === 2 ? "Scholar · 30 questions · 2 minutes" : "Prodigy · 2-minute speed round";
    el.leaderboardRule.textContent = settings.level === 3 ? "Accuracy · then correct" : "100% rounds only";
  }
  function showRecords() {
    const settings = settingsFromUI(), records = recordsFor(playerKey(el.playerName.value), settings);
    const repeats = Object.values(records.missedFacts).filter((weight) => weight > 0).length;
    el.records.innerHTML = settings.level === 3
      ? `<div class="record"><strong>${records.bestScore}%</strong><span>Best accuracy</span></div><div class="record"><strong>${records.bestCorrect}</strong><span>Most correct</span></div><div class="record"><strong>${repeats}</strong><span>Repeats next round</span></div>`
      : `<div class="record"><strong>${records.bestScore}%</strong><span>Best score</span></div><div class="record"><strong>${records.fastestPerfect === null ? "—" : formatTime(records.fastestPerfect)}</strong><span>Fastest 100%</span></div><div class="record"><strong>${repeats}</strong><span>Repeats next round</span></div>`;
  }
  function showPlayers() {
    const state = load(), settings = settingsFromUI(), key = modeKey(settings);
    el.playerList.replaceChildren();
    Object.values(state.players).sort((a, b) => a.displayName.localeCompare(b.displayName)).forEach((player) => {
      const option = document.createElement("option"); option.value = player.displayName; el.playerList.append(option);
    });
    let ranking = Object.values(state.players).map((player) => ({ ...player, record: player.recordsByMode[key] })).filter((player) => player.record);
    ranking = settings.level === 3
      ? ranking.filter((player) => player.record.roundsCompleted > 0).sort((a, b) => b.record.bestScore - a.record.bestScore || b.record.bestCorrect - a.record.bestCorrect)
      : ranking.filter((player) => player.record.fastestPerfect !== null).sort((a, b) => a.record.fastestPerfect - b.record.fastestPerfect);
    el.leaderboard.replaceChildren();
    if (!ranking.length) {
      const item = document.createElement("li"); item.className = "leaderboard-empty";
      item.textContent = settings.level === 3 ? "Complete a speed round to join this leaderboard." : "Complete a perfect round to join this leaderboard.";
      el.leaderboard.append(item); return;
    }
    ranking.slice(0, 5).forEach((player, position) => {
      const row = document.createElement("li"); row.className = "leaderboard-row";
      const rank = document.createElement("span"); rank.className = "leaderboard-rank"; rank.textContent = position + 1;
      const name = document.createElement("span"); name.className = "leaderboard-name"; name.textContent = player.displayName;
      const result = document.createElement("span"); result.className = "leaderboard-time";
      result.textContent = settings.level === 3 ? `${player.record.bestScore}% · ${player.record.bestCorrect}` : formatTime(player.record.fastestPerfect);
      row.append(rank, name, result); el.leaderboard.append(row);
    });
  }
  function refresh() {
    showSettings(); showRecords(); showPlayers();
    const state = load(); state.settings = settingsFromUI(); state.sound = el.sound.checked; save(state);
  }

  function playTone(isCorrect) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!el.sound.checked || !AudioContextClass) return;
    try {
      if (!audioContext) audioContext = new AudioContextClass();
      const now = audioContext.currentTime;
      const frequencies = isCorrect ? [523, 659] : [220, 185];
      frequencies.forEach((frequency, note) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.type = isCorrect ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + note * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.045, now + note * 0.09 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note * 0.09 + 0.13);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now + note * 0.09); oscillator.stop(now + note * 0.09 + 0.14);
      });
    } catch { /* Visual feedback remains available if audio is blocked. */ }
  }
  function screen(name) { el.start.hidden = name !== "start"; el.quiz.hidden = name !== "quiz"; el.results.hidden = name !== "results"; }
  function updateTimer() {
    const level = LEVELS[activeSettings.level], elapsed = Math.floor((Date.now() - startedAt) / 1000), remaining = level.seconds - elapsed;
    el.timer.textContent = formatTime(remaining);
    if (activeSettings.level === 3) el.progressBar.style.width = `${Math.min(100, elapsed / level.seconds * 100)}%`;
    if (remaining <= 0) finish(true);
  }
  function render() {
    const level = LEVELS[activeSettings.level], item = questions[index], renderedIndex = index;
    clearTimeout(unlockId);
    el.questionArea.classList.remove("feedback-correct", "feedback-incorrect"); el.answerFeedback.textContent = "";
    el.progressText.textContent = level.count ? `Question ${index + 1} of ${level.count}` : `Question ${index + 1}`;
    el.answeredText.textContent = `${answers.length} answered`;
    if (level.count) el.progressBar.style.width = `${answers.length / level.count * 100}%`;
    el.stripAnswered.textContent = answers.length; el.stripRemaining.textContent = level.count ? level.count - answers.length : "∞"; el.stripReview.textContent = reviewCount;
    el.factorTop.textContent = item.left; el.factorBottom.textContent = item.right; el.question.setAttribute("aria-label", `${item.left} times ${item.right}`); el.choices.replaceChildren();
    item.choices.forEach((choice) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "choice"; button.textContent = choice;
      button.setAttribute("aria-label", `Answer ${choice}`); button.disabled = locked; button.addEventListener("click", () => answer(choice, renderedIndex, button)); el.choices.append(button);
    });
    const firstChoice = el.choices.querySelector("button");
    if (firstChoice) firstChoice.focus();
  }
  function answer(choice, renderedIndex, selectedButton) {
    if (locked || renderedIndex !== index) return;
    locked = true; el.choices.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    const item = questions[index], isCorrect = choice === item.correct;
    selectedButton.classList.add(isCorrect ? "selected-correct" : "selected-incorrect");
    el.questionArea.classList.add(isCorrect ? "feedback-correct" : "feedback-incorrect");
    el.answerFeedback.textContent = isCorrect ? "Nice!" : "Keep going!";
    playTone(isCorrect);
    answers.push({ ...item, selected: choice, isCorrect });
    unlockId = setTimeout(() => {
      index += 1; locked = false;
      const count = LEVELS[activeSettings.level].count;
      if (count && index >= count) finish(false); else render();
    }, 480);
  }
  function choosePlayer() {
    const displayName = cleanName(el.playerName.value);
    if (!displayName) { el.playerError.textContent = "Enter a player name to begin."; el.playerName.focus(); return false; }
    const key = playerKey(displayName), state = load();
    if (!state.players[key]) state.players[key] = { displayName, recordsByMode: {} };
    state.currentPlayer = key; state.settings = settingsFromUI(); state.sound = el.sound.checked; save(state);
    activePlayer = key; el.playerName.value = state.players[key].displayName; el.playerError.textContent = ""; showPlayers(); return true;
  }
  function start(select = false) {
    if (select && !choosePlayer()) return;
    clearInterval(timerId); clearTimeout(unlockId); locked = false; activeSettings = settingsFromUI();
    const level = LEVELS[activeSettings.level]; questions = makeRound(activeSettings); answers = []; index = 0; startedAt = Date.now(); el.timer.textContent = formatTime(level.seconds);
    el.quizNote.textContent = activeSettings.level === 3 ? "Keep going until time is up. Accuracy still comes first." : "Choose your best answer. Results appear at the end.";
    screen("quiz"); render(); timerId = setInterval(updateTimer, 250);
  }
  function storeResult(score, correct, elapsed) {
    const state = load(), player = state.players[activePlayer]; if (!player) return;
    const key = modeKey(activeSettings), records = cleanRecords(player.recordsByMode[key]);
    if (activeSettings.level === 3) {
      if (score > records.bestScore || (score === records.bestScore && correct > records.bestCorrect)) { records.bestScore = score; records.bestCorrect = correct; }
    } else {
      records.bestScore = Math.max(records.bestScore, score);
      if (score === 100 && (records.fastestPerfect === null || elapsed < records.fastestPerfect)) records.fastestPerfect = elapsed;
    }
    answers.forEach((item) => {
      const fact = factKey(item.left, item.right), weight = Number(records.missedFacts[fact]) || 0;
      if (item.isCorrect) { if (weight <= 1) delete records.missedFacts[fact]; else records.missedFacts[fact] = weight - 1; }
      else records.missedFacts[fact] = Math.min(6, weight + 2);
    });
    records.roundsCompleted += 1; player.recordsByMode[key] = records; state.settings = activeSettings; save(state);
  }
  function showCorrections() {
    const missed = answers.filter((item) => !item.isCorrect);
    if (!missed.length) { el.corrections.innerHTML = '<p class="correct-message">Perfect round—every answer was correct!</p>'; return; }
    const rows = missed.map((item) => `<li><span>${item.left} × ${item.right}</span><span>You chose <strong>${item.selected}</strong> · Answer <strong>${item.correct}</strong></span></li>`).join("");
    el.corrections.innerHTML = `<h3>Practice these again</h3><ul class="correction-list">${rows}</ul>`;
  }
  function finish(timedOut) {
    clearInterval(timerId); timerId = null; clearTimeout(unlockId);
    const level = LEVELS[activeSettings.level], elapsed = Math.min(level.seconds, Math.floor((Date.now() - startedAt) / 1000));
    const correct = answers.filter((item) => item.isCorrect).length, score = answers.length ? Math.round(correct / answers.length * 100) : 0;
    el.score.textContent = `${score}%`; el.correctCount.textContent = `${correct}/${activeSettings.level === 3 ? answers.length : level.count}`; el.elapsedTime.textContent = formatTime(elapsed);
    el.resultHeading.textContent = score === 100 && answers.length ? "Perfect accuracy!" : "Round complete!";
    el.resultMessage.textContent = activeSettings.level === 3 ? `You answered ${answers.length} questions and got ${correct} correct. Keep accuracy high as your total grows.`
      : timedOut ? `Time is up. You answered ${answers.length} of ${level.count} questions. Review, then try again.`
        : score === 100 ? "Excellent work. Try again when you are ready to improve your time." : "Good practice. Practice the missed problems, then try another round.";
    storeResult(score, correct, elapsed); showCorrections(); showRecords(); showPlayers(); screen("results"); el.retryButton.focus();
  }

  el.startButton.addEventListener("click", () => start(true)); el.retryButton.addEventListener("click", () => start(false));
  el.playerName.addEventListener("input", () => { el.playerError.textContent = ""; showRecords(); });
  el.playerName.addEventListener("keydown", (event) => { if (event.key === "Enter") start(true); });
  el.level.addEventListener("change", refresh); el.focus.addEventListener("change", refresh); el.sound.addEventListener("change", refresh);
  el.range.addEventListener("change", () => { fillFocus(Number(el.range.value), el.focus.value); refresh(); });

  const initial = load(); el.level.value = initial.settings.level; el.range.value = initial.settings.range; el.sound.checked = initial.sound; fillFocus(initial.settings.range, initial.settings.focus);
  if (initial.players[initial.currentPlayer]) el.playerName.value = initial.players[initial.currentPlayer].displayName;
  refresh();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("service-worker.js").catch(() => {});
})();
