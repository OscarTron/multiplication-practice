(() => {
  "use strict";

  const ROUND_SIZE = 20;
  const ROUND_SECONDS = 10 * 60;
  const STORAGE_KEY = "multiplication-practice-records-v1";

  const elements = {
    startScreen: document.querySelector("#start-screen"),
    quizScreen: document.querySelector("#quiz-screen"),
    resultsScreen: document.querySelector("#results-screen"),
    startButton: document.querySelector("#start-button"),
    retryButton: document.querySelector("#retry-button"),
    timer: document.querySelector("#timer"),
    records: document.querySelector("#records"),
    stripAnswered: document.querySelector("#strip-answered"),
    stripRemaining: document.querySelector("#strip-remaining"),
    stripReview: document.querySelector("#strip-review"),
    progressText: document.querySelector("#progress-text"),
    answeredText: document.querySelector("#answered-text"),
    progressBar: document.querySelector("#progress-bar"),
    question: document.querySelector("#question"),
    factorTop: document.querySelector("#factor-top"),
    factorBottom: document.querySelector("#factor-bottom"),
    choices: document.querySelector("#choices"),
    resultHeading: document.querySelector("#result-heading"),
    score: document.querySelector("#score"),
    correctCount: document.querySelector("#correct-count"),
    elapsedTime: document.querySelector("#elapsed-time"),
    resultMessage: document.querySelector("#result-message"),
    corrections: document.querySelector("#corrections"),
  };

  let questions = [];
  let answers = [];
  let currentIndex = 0;
  let startedAt = 0;
  let timerId = null;
  let unlockTimerId = null;
  let reviewFactsInRound = 0;
  let answerLocked = false;

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }
    return copy;
  }

  function buildChoices(correct) {
    const choices = new Set([correct]);
    const nearbyOffsets = shuffle([-12, -10, -8, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 10, 12]);
    for (const offset of nearbyOffsets) {
      const candidate = correct + offset;
      if (candidate >= 0) choices.add(candidate);
      if (choices.size === 3) break;
    }
    return shuffle([...choices]);
  }

  function factKey(left, right) {
    return `${Math.min(left, right)}x${Math.max(left, right)}`;
  }

  function parseFactKey(key) {
    const [left, right] = key.split("x").map(Number);
    return Number.isInteger(left) && Number.isInteger(right)
      && left >= 0 && left <= 12 && right >= 0 && right <= 12
      ? { left, right }
      : null;
  }

  function createRound() {
    const factPool = [];
    for (let left = 0; left <= 12; left += 1) {
      for (let right = left; right <= 12; right += 1) {
        factPool.push({ left, right });
      }
    }

    const records = loadRecords();
    const reviewFacts = Object.entries(records.missedFacts)
      .filter(([, weight]) => Number.isFinite(weight) && weight > 0)
      .sort(([, firstWeight], [, secondWeight]) => secondWeight - firstWeight)
      .map(([key]) => parseFactKey(key))
      .filter(Boolean)
      .slice(0, 8);
    reviewFactsInRound = reviewFacts.length;

    const selectedKeys = new Set(reviewFacts.map((fact) => factKey(fact.left, fact.right)));
    const newFacts = shuffle(factPool)
      .filter((fact) => !selectedKeys.has(factKey(fact.left, fact.right)))
      .slice(0, ROUND_SIZE - reviewFacts.length);

    return shuffle([...reviewFacts, ...newFacts]).map((fact) => {
      const shouldSwap = fact.left !== fact.right && Math.random() < 0.5;
      const left = shouldSwap ? fact.right : fact.left;
      const right = shouldSwap ? fact.left : fact.right;
      return {
        left,
        right,
        correct: left * right,
        choices: buildChoices(left * right),
      };
    });
  }

  function formatTime(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function loadRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return {
        bestScore: Number.isFinite(saved.bestScore) ? saved.bestScore : 0,
        fastestPerfect: Number.isFinite(saved.fastestPerfect) ? saved.fastestPerfect : null,
        missedFacts: saved.missedFacts && typeof saved.missedFacts === "object" ? saved.missedFacts : {},
        roundsCompleted: Number.isFinite(saved.roundsCompleted) ? saved.roundsCompleted : 0,
      };
    } catch {
      return { bestScore: 0, fastestPerfect: null, missedFacts: {}, roundsCompleted: 0 };
    }
  }

  function showRecords() {
    const records = loadRecords();
    const reviewCount = Object.values(records.missedFacts).filter((weight) => weight > 0).length;
    elements.records.innerHTML = `
      <div class="record"><strong>${records.bestScore}%</strong><span>Best score</span></div>
      <div class="record"><strong>${records.fastestPerfect === null ? "—" : formatTime(records.fastestPerfect)}</strong><span>Fastest 100%</span></div>
      <div class="record"><strong>${reviewCount}</strong><span>Repeats next round</span></div>
    `;
  }

  function showScreen(screen) {
    elements.startScreen.hidden = screen !== "start";
    elements.quizScreen.hidden = screen !== "quiz";
    elements.resultsScreen.hidden = screen !== "results";
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = ROUND_SECONDS - elapsed;
    elements.timer.textContent = formatTime(remaining);
    if (remaining <= 0) finishRound(true);
  }

  function renderQuestion() {
    const item = questions[currentIndex];
    const renderedQuestionIndex = currentIndex;
    clearTimeout(unlockTimerId);
    elements.progressText.textContent = `Question ${currentIndex + 1} of ${ROUND_SIZE}`;
    elements.answeredText.textContent = `${answers.length} answered`;
    elements.progressBar.style.width = `${(answers.length / ROUND_SIZE) * 100}%`;
    elements.stripAnswered.textContent = answers.length;
    elements.stripRemaining.textContent = ROUND_SIZE - answers.length;
    elements.stripReview.textContent = reviewFactsInRound;
    elements.factorTop.textContent = item.left;
    elements.factorBottom.textContent = item.right;
    elements.question.setAttribute("aria-label", `${item.left} times ${item.right}`);
    elements.choices.replaceChildren();

    item.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = choice;
      button.setAttribute("aria-label", `Answer ${choice}`);
      button.disabled = answerLocked;
      button.addEventListener("click", () => selectAnswer(choice, renderedQuestionIndex));
      elements.choices.append(button);
    });
    if (answerLocked) {
      unlockTimerId = setTimeout(() => {
        if (currentIndex !== renderedQuestionIndex) return;
        answerLocked = false;
        elements.choices.querySelectorAll("button").forEach((button) => {
          button.disabled = false;
        });
        elements.choices.querySelector("button")?.focus();
      }, 350);
    } else {
      elements.choices.querySelector("button")?.focus();
    }
  }

  function selectAnswer(choice, renderedQuestionIndex) {
    if (answerLocked || renderedQuestionIndex !== currentIndex) return;
    answerLocked = true;
    elements.choices.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
    const item = questions[currentIndex];
    answers.push({ ...item, selected: choice, isCorrect: choice === item.correct });
    currentIndex += 1;
    if (currentIndex >= ROUND_SIZE) finishRound(false);
    else renderQuestion();
  }

  function startRound() {
    clearInterval(timerId);
    clearTimeout(unlockTimerId);
    answerLocked = false;
    questions = createRound();
    answers = [];
    currentIndex = 0;
    startedAt = Date.now();
    elements.timer.textContent = "10:00";
    showScreen("quiz");
    renderQuestion();
    timerId = setInterval(updateTimer, 250);
  }

  function saveRecords(score, elapsed) {
    const records = loadRecords();
    records.bestScore = Math.max(records.bestScore, score);
    if (score === 100 && (records.fastestPerfect === null || elapsed < records.fastestPerfect)) {
      records.fastestPerfect = elapsed;
    }
    answers.forEach((answer) => {
      const key = factKey(answer.left, answer.right);
      const currentWeight = Number(records.missedFacts[key]) || 0;
      if (answer.isCorrect) {
        const reducedWeight = Math.max(0, currentWeight - 1);
        if (reducedWeight === 0) delete records.missedFacts[key];
        else records.missedFacts[key] = reducedWeight;
      } else {
        records.missedFacts[key] = Math.min(6, currentWeight + 2);
      }
    });
    records.roundsCompleted += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function renderCorrections() {
    const missed = answers.filter((answer) => !answer.isCorrect);
    if (missed.length === 0) {
      elements.corrections.innerHTML = '<p class="correct-message">Perfect round—every answer was correct!</p>';
      return;
    }
    const rows = missed.map((answer) =>
      `<li><span>${answer.left} × ${answer.right}</span><span>You chose <strong>${answer.selected}</strong> · Answer <strong>${answer.correct}</strong></span></li>`
    ).join("");
    elements.corrections.innerHTML = `<h3>Practice these again</h3><ul class="correction-list">${rows}</ul>`;
  }

  function finishRound(timedOut) {
    clearInterval(timerId);
    timerId = null;
    const elapsed = Math.min(ROUND_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const score = Math.round((correct / ROUND_SIZE) * 100);

    elements.score.textContent = `${score}%`;
    elements.correctCount.textContent = `${correct}/${ROUND_SIZE}`;
    elements.elapsedTime.textContent = formatTime(elapsed);
    elements.resultHeading.textContent = score === 100 ? "Perfect accuracy!" : "Round complete!";
    elements.resultMessage.textContent = timedOut
      ? `Time is up. You answered ${answers.length} of ${ROUND_SIZE} questions. Review, then try again.`
      : score === 100
        ? "Excellent work. Try again when you are ready to improve your time."
        : "Good practice. Practice the missed problems, then try another round.";

    saveRecords(score, elapsed);
    renderCorrections();
    showRecords();
    showScreen("results");
    elements.retryButton.focus();
  }

  elements.startButton.addEventListener("click", startRound);
  elements.retryButton.addEventListener("click", startRound);
  showRecords();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
})();
