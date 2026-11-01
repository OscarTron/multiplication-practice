(() => {
  "use strict";

  const STORE = "multiplication-practice-records-v1";
  const LEVELS = {
    1: { name: "Student", count: 20, seconds: 600, text: "Student: 20 questions with a relaxed 10-minute timer." },
    2: { name: "Scholar", count: 30, seconds: 120, text: "Scholar: 30 questions in 2 minutes. Finish accurately before time runs out." },
    3: { name: "Prodigy", count: null, seconds: 120, text: "Prodigy: answer as many questions as you can in 2 minutes." },
  };
  const DEFAULTS = { level: 1, range: 10, focus: "all", practiceMinutes: 10 };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    start: $("#start-screen"), quiz: $("#quiz-screen"), results: $("#results-screen"),
    startButton: $("#start-button"), retryButton: $("#retry-button"), homeButton: $("#home-button"), timer: $("#timer"),
    roundLabel: $("#round-label"), records: $("#records"), playerName: $("#player-name"),
    playerList: $("#player-list"), playerError: $("#player-error"), level: $("#level-select"),
    range: $("#range-select"), focus: $("#focus-select"), practiceTime: $("#practice-time-select"), practiceTimeSetting: $("#practice-time-setting"),
    sound: $("#sound-toggle"), settingsSummary: $("#settings-summary"),
    levelDescription: $("#level-description"), leaderboard: $("#leaderboard-list"),
    leaderboardRule: $("#leaderboard-rule"), stripAnswered: $("#strip-answered"),
    stripRemaining: $("#strip-remaining"), stripReview: $("#strip-review"),
    progressText: $("#progress-text"), answeredText: $("#answered-text"), progressBar: $("#progress-bar"),
    questionArea: $(".question-area"), question: $("#question"), factorTop: $("#factor-top"), factorBottom: $("#factor-bottom"),
    choices: $("#choices"), quizNote: $("#quiz-note"), resultHeading: $("#result-heading"),
    score: $("#score"), correctCount: $("#correct-count"), elapsedTime: $("#elapsed-time"),
    answerFeedback: $("#answer-feedback"), resultMessage: $("#result-message"), corrections: $("#corrections"),
    progressBody: $("#progress-body"), progressEmpty: $("#progress-empty"), exportProgress: $("#export-progress"),
    chart: $("#chart-screen"), cards: $("#cards-screen"), openChart: $("#open-chart"), openCards: $("#open-cards"), chartHome: $("#chart-home"), cardsHome: $("#cards-home"),
    chartWrap: $("#chart-wrap"), tableCheckboxes: $("#table-checkboxes"), selectAllTables: $("#select-all-tables"), clearTables: $("#clear-tables"),
    startCards: $("#start-cards"), cardsError: $("#cards-error"), cardSetup: $("#card-setup"), cardSession: $("#card-session"), cardComplete: $("#card-complete"),
    studyCard: $("#study-card"), cardProgress: $("#card-progress"), previousCard: $("#previous-card"), nextCard: $("#next-card"), restartCards: $("#restart-cards"),
  };

  let questions = [], answers = [], index = 0, startedAt = 0, timerId = null, unlockId = null;
  let reviewCount = 0, locked = false, activePlayer = "", activeSettings = { ...DEFAULTS };
  let audioContext = null;
  let studyCards = [], studyIndex = 0, studyStartedAt = 0, studyTimerId = null;

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
    const practiceMinutes = [5, 10, 20, 30].includes(Number(source.practiceMinutes)) ? Number(source.practiceMinutes) : 10;
    const candidate = source.focus === "all" ? "all" : Number(source.focus);
    const focus = candidate === "all" || (Number.isInteger(candidate) && candidate >= 0 && candidate <= range) ? String(candidate) : "all";
    return { level, range, focus, practiceMinutes };
  }
  const modeKey = (settings) => `level${settings.level}-range${settings.range}-${settings.focus === "all" ? "mixed" : `table${settings.focus}`}`;
  const cleanName = (value) => value.trim().replace(/\s+/g, " ").slice(0, 16);
  const playerKey = (value) => cleanName(value).toLocaleLowerCase();
  function cleanPlayer(value, fallback) {
    const displayName = cleanName((value && value.displayName) || fallback);
    const history = value && Array.isArray(value.history) ? value.history.slice(-200) : [];
    const recordsByMode = {};
    if (value && value.recordsByMode && typeof value.recordsByMode === "object") {
      Object.entries(value.recordsByMode).forEach(([key, records]) => { recordsByMode[key] = cleanRecords(records); });
    } else if (value && typeof value === "object") {
      recordsByMode["level1-range12-mixed"] = cleanRecords(value);
    }
    return { displayName, history, recordsByMode };
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
  const settingsFromUI = () => cleanSettings({ level: el.level.value, range: el.range.value, focus: el.focus.value, practiceMinutes: el.practiceTime.value });
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
  function timerSeconds(settings) { return settings.level === 1 ? settings.practiceMinutes * 60 : LEVELS[settings.level].seconds; }
  function settingsName(settings) {
    const duration = settings.level === 1 ? ` · ${settings.practiceMinutes} min` : "";
    return `${LEVELS[settings.level].name}${duration} · 0–${settings.range} · ${settings.focus === "all" ? "Mixed" : `×${settings.focus} only`}`;
  }
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
    el.practiceTimeSetting.hidden = settings.level !== 1;
    el.levelDescription.textContent = settings.level === 1 ? `Student: 20 questions with a ${settings.practiceMinutes}-minute timer.` : level.text;
    el.roundLabel.textContent = settings.level === 1 ? `Student · 20 questions · ${settings.practiceMinutes} minutes`
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
  function showProgress() {
    const player = load().players[playerKey(el.playerName.value)];
    const history = player && Array.isArray(player.history) ? player.history.slice(-20).reverse() : [];
    el.progressBody.replaceChildren();
    history.forEach((round) => {
      const row = document.createElement("tr");
      const values = [
        new Date(round.completedAt).toLocaleDateString(),
        round.mode,
        `${round.score}%`,
        `${round.correct}/${round.answered}`,
        formatTime(round.elapsed),
      ];
      values.forEach((value) => { const cell = document.createElement("td"); cell.textContent = value; row.append(cell); });
      el.progressBody.append(row);
    });
    el.progressEmpty.hidden = history.length > 0;
    el.exportProgress.hidden = history.length === 0;
  }
  function exportProgress() {
    const player = load().players[playerKey(el.playerName.value)];
    if (!player || !player.history || !player.history.length) return;
    const rows = [["Date", "Player", "Mode", "Range", "Table", "Score", "Correct", "Answered", "Time seconds"]];
    player.history.forEach((round) => rows.push([
      round.completedAt, player.displayName, LEVELS[round.level].name, `0-${round.range}`,
      round.focus === "all" ? "Mixed" : `x${round.focus}`, round.score, round.correct, round.answered, round.elapsed,
    ]));
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${player.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "player"}-multiplication-progress.csv`;
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
  function refresh() {
    showSettings(); showRecords(); showPlayers(); showProgress();
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
  function screen(name) {
    el.start.hidden = name !== "start"; el.quiz.hidden = name !== "quiz"; el.results.hidden = name !== "results";
    el.chart.hidden = name !== "chart"; el.cards.hidden = name !== "cards";
  }
  function buildChart() {
    const range = Number(el.range.value), table = document.createElement("table"); table.className = "multiplication-chart";
    const head = document.createElement("tr");
    for (let column = -1; column <= range; column += 1) { const cell = document.createElement("th"); cell.textContent = column < 0 ? "×" : column; cell.dataset.column = column; head.append(cell); }
    table.append(head);
    for (let row = 0; row <= range; row += 1) {
      const line = document.createElement("tr"), label = document.createElement("th"); label.textContent = row; label.dataset.row = row; line.append(label);
      for (let column = 0; column <= range; column += 1) { const cell = document.createElement("td"); cell.textContent = row * column; cell.dataset.row = row; cell.dataset.column = column; line.append(cell); }
      table.append(line);
    }
    table.addEventListener("click", (event) => {
      const cell = event.target.closest("th, td"); if (!cell) return; const row = cell.dataset.row, column = cell.dataset.column;
      table.querySelectorAll(".chart-highlight").forEach((item) => item.classList.remove("chart-highlight"));
      if (row !== undefined) table.querySelectorAll(`[data-row="${row}"]`).forEach((item) => item.classList.add("chart-highlight"));
      if (column !== undefined && Number(column) >= 0) table.querySelectorAll(`[data-column="${column}"]`).forEach((item) => item.classList.add("chart-highlight"));
    });
    el.chartWrap.replaceChildren(table);
  }
  function buildTableChoices() {
    const range = Number(el.range.value); el.tableCheckboxes.replaceChildren();
    for (let number = 0; number <= range; number += 1) {
      const label = document.createElement("label"), input = document.createElement("input"); input.type = "checkbox"; input.value = number; input.checked = true;
      label.append(input, document.createTextNode(` ×${number}`)); el.tableCheckboxes.append(label);
    }
  }
  function renderStudyCard() {
    const card = studyCards[studyIndex]; el.studyCard.innerHTML = `<span>${card.left} × ${card.right}</span><strong>= ${card.left * card.right}</strong>`;
    el.cardProgress.textContent = `Card ${studyIndex + 1} of ${studyCards.length}`; el.previousCard.disabled = studyIndex === 0;
  }
  function finishStudy() {
    clearInterval(studyTimerId); studyTimerId = null; el.timer.textContent = "0:00"; el.cardSession.hidden = true; el.cardComplete.hidden = false; el.restartCards.focus();
  }
  function updateStudyTimer() {
    const remaining = 300 - Math.floor((Date.now() - studyStartedAt) / 1000); el.timer.textContent = formatTime(remaining); if (remaining <= 0) finishStudy();
  }
  function startStudy() {
    const selected = [...el.tableCheckboxes.querySelectorAll("input:checked")].map((input) => Number(input.value));
    if (!selected.length) { el.cardsError.textContent = "Choose at least one table."; return; }
    const range = Number(el.range.value); studyCards = shuffle(selected.flatMap((left) => Array.from({ length: range + 1 }, (_, right) => ({ left, right }))));
    studyIndex = 0; studyStartedAt = Date.now(); el.cardsError.textContent = ""; el.cardSetup.hidden = true; el.cardComplete.hidden = true; el.cardSession.hidden = false;
    el.timer.textContent = "5:00"; renderStudyCard(); clearInterval(studyTimerId); studyTimerId = setInterval(updateStudyTimer, 250);
  }
  function openLearn(name) {
    clearInterval(timerId); clearInterval(studyTimerId); studyTimerId = null; el.timer.textContent = name === "cards" ? "5:00" : formatTime(timerSeconds(settingsFromUI()));
    if (name === "chart") buildChart(); else { buildTableChoices(); el.cardSetup.hidden = false; el.cardSession.hidden = true; el.cardComplete.hidden = true; }
    screen(name);
  }
  function updateTimer() {
    const level = LEVELS[activeSettings.level], duration = timerSeconds(activeSettings), elapsed = Math.floor((Date.now() - startedAt) / 1000), remaining = duration - elapsed;
    el.timer.textContent = formatTime(remaining);
    if (activeSettings.level === 3) el.progressBar.style.width = `${Math.min(100, elapsed / duration * 100)}%`;
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
    if (!state.players[key]) state.players[key] = { displayName, history: [], recordsByMode: {} };
    state.currentPlayer = key; state.settings = settingsFromUI(); state.sound = el.sound.checked; save(state);
    activePlayer = key; el.playerName.value = state.players[key].displayName; el.playerError.textContent = ""; showPlayers(); return true;
  }
  function start(select = false) {
    if (select && !choosePlayer()) return;
    clearInterval(timerId); clearTimeout(unlockId); locked = false; activeSettings = settingsFromUI();
    const level = LEVELS[activeSettings.level]; questions = makeRound(activeSettings); answers = []; index = 0; startedAt = Date.now(); el.timer.textContent = formatTime(timerSeconds(activeSettings));
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
    records.roundsCompleted += 1; player.recordsByMode[key] = records;
    if (!Array.isArray(player.history)) player.history = [];
    player.history.push({
      completedAt: new Date().toISOString(), level: activeSettings.level, range: activeSettings.range,
      focus: activeSettings.focus, practiceMinutes: activeSettings.practiceMinutes, mode: settingsName(activeSettings), score, correct,
      answered: answers.length, elapsed,
    });
    player.history = player.history.slice(-200);
    state.settings = activeSettings; save(state);
  }
  function showCorrections() {
    const missed = answers.filter((item) => !item.isCorrect);
    if (!missed.length) { el.corrections.innerHTML = '<p class="correct-message">Perfect round—every answer was correct!</p>'; return; }
    const rows = missed.map((item) => `<li><span>${item.left} × ${item.right}</span><span>You chose <strong>${item.selected}</strong> · Answer <strong>${item.correct}</strong></span></li>`).join("");
    el.corrections.innerHTML = `<h3>Practice these again</h3><ul class="correction-list">${rows}</ul>`;
  }
  function finish(timedOut) {
    clearInterval(timerId); timerId = null; clearTimeout(unlockId);
    const level = LEVELS[activeSettings.level], elapsed = Math.min(timerSeconds(activeSettings), Math.floor((Date.now() - startedAt) / 1000));
    const correct = answers.filter((item) => item.isCorrect).length, score = answers.length ? Math.round(correct / answers.length * 100) : 0;
    el.score.textContent = `${score}%`; el.correctCount.textContent = `${correct}/${activeSettings.level === 3 ? answers.length : level.count}`; el.elapsedTime.textContent = formatTime(elapsed);
    el.resultHeading.textContent = score === 100 && answers.length ? "Perfect accuracy!" : "Round complete!";
    el.resultMessage.textContent = activeSettings.level === 3 ? `You answered ${answers.length} questions and got ${correct} correct. Keep accuracy high as your total grows.`
      : timedOut ? `Time is up! You answered ${answers.length} of ${level.count} questions. Great effort—every round makes you stronger.`
        : score === 100 ? "Excellent work. Try again when you are ready to improve your time." : "Good practice. Practice the missed problems, then try another round.";
    storeResult(score, correct, elapsed); showCorrections(); showRecords(); showPlayers(); showProgress(); screen("results"); el.retryButton.focus();
  }

  function goHome() {
    clearInterval(timerId); timerId = null; clearInterval(studyTimerId); studyTimerId = null; clearTimeout(unlockId); locked = false;
    el.timer.textContent = formatTime(timerSeconds(settingsFromUI()));
    screen("start"); refresh(); el.startButton.focus();
  }

  el.startButton.addEventListener("click", () => start(true)); el.retryButton.addEventListener("click", () => start(false)); el.homeButton.addEventListener("click", goHome);
  el.openChart.addEventListener("click", () => openLearn("chart")); el.openCards.addEventListener("click", () => openLearn("cards"));
  el.chartHome.addEventListener("click", goHome); el.cardsHome.addEventListener("click", goHome);
  el.selectAllTables.addEventListener("click", () => el.tableCheckboxes.querySelectorAll("input").forEach((input) => { input.checked = true; }));
  el.clearTables.addEventListener("click", () => el.tableCheckboxes.querySelectorAll("input").forEach((input) => { input.checked = false; }));
  el.startCards.addEventListener("click", startStudy);
  el.restartCards.addEventListener("click", () => { buildTableChoices(); el.timer.textContent = "5:00"; el.cardSetup.hidden = false; el.cardComplete.hidden = true; });
  el.previousCard.addEventListener("click", () => { if (studyIndex > 0) { studyIndex -= 1; renderStudyCard(); } });
  el.nextCard.addEventListener("click", () => { studyIndex = (studyIndex + 1) % studyCards.length; renderStudyCard(); });
  el.playerName.addEventListener("input", () => {
    el.playerError.textContent = ""; showRecords(); showProgress();
  });
  el.playerName.addEventListener("keydown", (event) => { if (event.key === "Enter") start(true); });
  el.level.addEventListener("change", refresh); el.focus.addEventListener("change", refresh); el.practiceTime.addEventListener("change", refresh); el.sound.addEventListener("change", refresh);
  el.exportProgress.addEventListener("click", exportProgress);
  el.range.addEventListener("change", () => { fillFocus(Number(el.range.value), el.focus.value); refresh(); });

  const initial = load(); el.level.value = initial.settings.level; el.range.value = initial.settings.range; el.practiceTime.value = initial.settings.practiceMinutes; el.sound.checked = initial.sound; fillFocus(initial.settings.range, initial.settings.focus);
  if (initial.players[initial.currentPlayer]) {
    el.playerName.value = initial.players[initial.currentPlayer].displayName;
  }
  refresh();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("service-worker.js").catch(() => {});
})();
