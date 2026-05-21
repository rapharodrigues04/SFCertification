const CFG = window.QUIZ_CONFIG || {};
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PASS_THRESHOLD = CFG.passThreshold || 0.65;
const SESSION_SIZE = CFG.sessionSize || 60;

let quizData = [];
let sessionQuestions = [];
let currentQuestion = 0;
let correctAnswers = 0;
let feedbackShown = false;

// ── DOM refs ──
const screens = {
  start: document.getElementById('startScreen'),
  quiz:  document.getElementById('quizScreen'),
  result: document.getElementById('resultScreen'),
};

const el = {
  totalCount:       document.getElementById('totalQuestionsCount'),
  startBtn:         document.getElementById('startBtn'),
  questionCounter:  document.getElementById('questionCounter'),
  incorrectDisplay: document.getElementById('incorrectDisplay'),
  progressBar:      document.getElementById('progressBar'),
  questionTag:      document.getElementById('questionTag'),
  questionText:     document.getElementById('questionText'),
  multipleHint:     document.getElementById('multipleHint'),
  answersContainer: document.getElementById('answersContainer'),
  feedbackBanner:   document.getElementById('feedbackBanner'),
  feedbackIcon:     document.getElementById('feedbackIcon'),
  feedbackTitle:    document.getElementById('feedbackTitle'),
  feedbackDetail:   document.getElementById('feedbackDetail'),
  nextBtn:          document.getElementById('nextBtn'),
  clearBtn:         document.getElementById('clearBtn'),
  exitBtn:          document.getElementById('exitBtn'),
  exitModal:        document.getElementById('exitModal'),
  confirmExit:      document.getElementById('confirmExit'),
  cancelExit:       document.getElementById('cancelExit'),
  resultBadge:      document.getElementById('resultBadge'),
  resultTitle:      document.getElementById('resultTitle'),
  resultSubtitle:   document.getElementById('resultSubtitle'),
  resultPercent:    document.getElementById('resultPercent'),
  ringFill:         document.getElementById('ringFill'),
  correctCount:     document.getElementById('correctCount'),
  incorrectCount:   document.getElementById('incorrectCount'),
  totalCountResult: document.getElementById('totalCount'),
  restartBtn:       document.getElementById('restartBtn'),
  backHomeBtn:      document.getElementById('backHomeBtn'),
  livePercent:      document.getElementById('livePercent'),
};

// ── Utility ──
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, s]) => {
    const active = key === name;
    s.style.display = active ? 'flex' : 'none';
    s.classList.toggle('active', active);
  });
}

// ── Load ──
fetch(CFG.dataFile || './quiz.json')
  .then(r => { if (!r.ok) throw new Error(); return r.json(); })
  .then(data => {
    quizData = data;
    el.totalCount.textContent = Math.min(data.length, SESSION_SIZE);
    el.startBtn.disabled = false;
    el.startBtn.querySelector('.btn-text').textContent = 'Iniciar Quiz';
  })
  .catch(() => {
    el.startBtn.querySelector('.btn-text').textContent = 'Erro ao carregar';
    el.totalCount.textContent = '—';
  });

// ── Start ──
function startSession() {
  shuffle(quizData);
  sessionQuestions = quizData.slice(0, SESSION_SIZE);
  currentQuestion = 0;
  score = 0;
  correctAnswers = 0;
  feedbackShown = false;
  el.incorrectDisplay.textContent = '—';
  el.incorrectDisplay.parentElement.className = 'score-badge';
  el.livePercent.textContent = '—';
  el.livePercent.parentElement.className = 'score-badge';
  el.ringFill.style.strokeDashoffset = 314;
  showScreen('quiz');
  renderQuestion();
}

el.startBtn.addEventListener('click', startSession);

// ── Render question ──
function renderQuestion() {
  feedbackShown = false;
  const q = sessionQuestions[currentQuestion];
  const total = sessionQuestions.length;

  el.questionTag.textContent = `Pergunta ${currentQuestion + 1}`;
  el.questionCounter.textContent = `${currentQuestion + 1} / ${total}`;
  el.progressBar.style.width = `${((currentQuestion) / total) * 100}%`;

  el.questionText.textContent = q.question;
  el.multipleHint.classList.toggle('hidden', !q.multiple);

  el.answersContainer.innerHTML = '';
  q.options.forEach((option, idx) => {
    const div = document.createElement('div');
    div.className = 'answer';
    div.dataset.index = idx;
    const text = option.replace(/^[A-F]\.\s*/, '');
    div.innerHTML = `
      <span class="answer-letter">${LETTERS[idx]}</span>
      <span class="answer-text">${text}</span>
    `;
    div.addEventListener('click', () => selectAnswer(div, q));
    el.answersContainer.appendChild(div);
  });

  hideFeedback();
  el.nextBtn.style.display = 'none';
  el.nextBtn.querySelector('.btn-text').textContent = 'Confirmar';
}

function selectAnswer(div, q) {
  if (feedbackShown || div.classList.contains('disabled')) return;

  if (q.multiple) {
    div.classList.toggle('selected');
  } else {
    document.querySelectorAll('.answer.selected').forEach(a => a.classList.remove('selected'));
    div.classList.add('selected');
  }

  const anySelected = document.querySelectorAll('.answer.selected').length > 0;
  el.nextBtn.style.display = anySelected ? 'inline-flex' : 'none';
}

// ── Next / Confirm ──
el.nextBtn.addEventListener('click', () => {
  if (!feedbackShown) {
    confirmAnswer();
  } else {
    advance();
  }
});

function confirmAnswer() {
  const q = sessionQuestions[currentQuestion];
  const selectedEls = [...document.querySelectorAll('.answer.selected')];
  const selectedIndices = selectedEls.map(e => parseInt(e.dataset.index));

  let isCorrect = false;

  if (q.multiple) {
    const correctSet = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]);
    const selectedSet = new Set(selectedIndices);
    isCorrect = correctSet.size === selectedSet.size && [...correctSet].every(i => selectedSet.has(i));

    document.querySelectorAll('.answer').forEach(a => {
      const idx = parseInt(a.dataset.index);
      if (correctSet.has(idx)) a.classList.add('correct');
      if (selectedSet.has(idx) && !correctSet.has(idx)) a.classList.add('incorrect');
      a.classList.add('disabled');
    });
  } else {
    const correctIdx = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    const selectedIdx = selectedIndices[0];
    isCorrect = selectedIdx === correctIdx;

    document.querySelectorAll('.answer').forEach(a => {
      const idx = parseInt(a.dataset.index);
      if (idx === correctIdx) a.classList.add('correct');
      else if (idx === selectedIdx) a.classList.add('incorrect');
      a.classList.add('disabled');
    });
  }

  if (isCorrect) {
    correctAnswers++;
    showFeedback(true);
  } else {
    showFeedback(false, q, q.multiple ? q.correct : [Array.isArray(q.correct) ? q.correct[0] : q.correct]);
  }

  const answeredSoFar = currentQuestion + 1;
  const incorrectSoFar = answeredSoFar - correctAnswers;
  const pctSoFar = Math.round((correctAnswers / answeredSoFar) * 100);

  el.incorrectDisplay.textContent = `${100 - pctSoFar}%`;
  el.incorrectDisplay.parentElement.className = 'score-badge score-badge--fail';
  el.livePercent.textContent = `${pctSoFar}%`;
  const state = pctSoFar >= PASS_THRESHOLD * 100
    ? 'score-badge--pass'
    : pctSoFar >= (PASS_THRESHOLD - 0.1) * 100
      ? 'score-badge--warning'
      : 'score-badge--fail';
  el.livePercent.parentElement.className = `score-badge ${state}`;

  feedbackShown = true;
  el.nextBtn.querySelector('.btn-text').textContent =
    currentQuestion < sessionQuestions.length - 1 ? 'Próxima' : 'Ver Resultado';
}

function advance() {
  currentQuestion++;
  if (currentQuestion < sessionQuestions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

// ── Feedback ──
function showFeedback(correct, q, correctIndices) {
  el.feedbackBanner.className = `feedback-banner ${correct ? 'correct-feedback' : 'incorrect-feedback'}`;
  el.feedbackIcon.textContent = correct ? '✓' : '✗';

  if (correct) {
    el.feedbackTitle.textContent = 'Resposta correta!';
    el.feedbackDetail.textContent = 'Excelente! Continue assim.';
  } else {
    el.feedbackTitle.textContent = 'Resposta incorreta';
    const letters = correctIndices.map(i => LETTERS[i]).join(', ');
    el.feedbackDetail.textContent = `A resposta correta é: ${letters}`;
  }
}

function hideFeedback() {
  el.feedbackBanner.className = 'feedback-banner hidden';
}

// ── Clear ──
el.clearBtn.addEventListener('click', () => {
  if (feedbackShown) return;
  document.querySelectorAll('.answer').forEach(a =>
    a.classList.remove('selected', 'correct', 'incorrect', 'disabled')
  );
  el.nextBtn.style.display = 'none';
});

// ── Exit ──
el.exitBtn.addEventListener('click', () => el.exitModal.classList.remove('hidden'));
el.cancelExit.addEventListener('click', () => el.exitModal.classList.add('hidden'));
el.confirmExit.addEventListener('click', () => {
  el.exitModal.classList.add('hidden');
  showScreen('start');
});

// ── Result ──
function showResult() {
  const total = sessionQuestions.length;
  const incorrect = total - correctAnswers;
  const pct = Math.round((correctAnswers / total) * 100);
  const passed = pct >= PASS_THRESHOLD * 100;

  el.resultBadge.textContent = passed ? '🏆' : '📚';
  el.resultBadge.className = `result-badge ${passed ? 'pass' : 'fail'}`;
  el.resultTitle.textContent = passed ? 'Parabéns!' : 'Continue Praticando';
  el.resultSubtitle.textContent = passed
    ? 'Você atingiu a pontuação de aprovação do exame.'
    : `Você precisa de ${Math.ceil(PASS_THRESHOLD * 100)}% para ser aprovado. Tente novamente!`;

  el.correctCount.textContent = correctAnswers;
  el.incorrectCount.textContent = incorrect;
  el.totalCountResult.textContent = total;

  showScreen('result');

  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  el.ringFill.style.stroke = passed ? '#2ECC71' : '#E74C3C';
  el.resultPercent.style.color = passed ? '#2ECC71' : '#E74C3C';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.ringFill.style.strokeDashoffset = offset;
    });
  });

  let current = 0;
  const step = pct / 60;
  const interval = setInterval(() => {
    current = Math.min(current + step, pct);
    el.resultPercent.textContent = `${Math.round(current)}%`;
    if (current >= pct) clearInterval(interval);
  }, 16);

  el.progressBar.style.width = '100%';
}

// ── Restart / Home ──
el.restartBtn.addEventListener('click', startSession);

el.backHomeBtn.addEventListener('click', () => {
  el.ringFill.style.strokeDashoffset = 314;
  showScreen('start');
});
