const CFG = window.QUIZ_CONFIG || {};
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PASS_THRESHOLD = CFG.passThreshold || 0.65;
const SESSION_SIZE = CFG.sessionSize || 60;
const INDEX_MODE = CFG.indexMode || false;
const SIMULADO_MODE = CFG.simuladoMode || false;
const SIMULADO_SIZE = CFG.simuladoSize || SESSION_SIZE;

let quizData = [];
let sessionQuestions = [];
let currentQuestion = 0;
let correctAnswers = 0;
let feedbackShown = false;
let questionStates = [];
let currentSimulado = null;

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

// ── Index Panel ──
function renderIndex() {
  const grid = document.getElementById('indexGrid');
  const progressText = document.getElementById('indexProgressText');
  if (!grid) return;

  const total = sessionQuestions.length;
  const answered = questionStates.filter(s => s.answered).length;
  if (progressText) progressText.textContent = `${answered}/${total} respondidas`;

  grid.innerHTML = '';
  sessionQuestions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.className = 'index-btn';
    btn.textContent = idx + 1;
    if (idx === currentQuestion) btn.classList.add('index-btn--current');
    if (questionStates[idx] && questionStates[idx].answered) btn.classList.add('index-btn--answered');
    btn.addEventListener('click', () => navigateTo(idx));
    grid.appendChild(btn);
  });
}

function navigateTo(idx) {
  currentQuestion = idx;
  renderQuestion();
}

// ── Load ──
fetch(CFG.dataFile || './quiz.json')
  .then(r => { if (!r.ok) throw new Error(); return r.json(); })
  .then(data => {
    quizData = data;

    if (SIMULADO_MODE) {
      el.totalCount.textContent = data.length;
      buildSimuladoGrid(data.length);
    } else {
      el.totalCount.textContent = Math.min(data.length, SESSION_SIZE);
      el.startBtn.style.display = '';
      el.startBtn.disabled = false;
      el.startBtn.querySelector('.btn-text').textContent = 'Iniciar Quiz';
    }
  })
  .catch(() => {
    el.totalCount.textContent = '—';
    if (!SIMULADO_MODE) {
      el.startBtn.style.display = '';
      el.startBtn.querySelector('.btn-text').textContent = 'Erro ao carregar';
    }
  });

function buildSimuladoGrid(total) {
  const container = document.getElementById('simuladoContainer');
  if (!container) return;
  const numSimulados = Math.max(1, Math.floor(total / SIMULADO_SIZE));
  container.innerHTML = '';
  for (let i = 0; i < numSimulados; i++) {
    const start = i * SIMULADO_SIZE + 1;
    const end = (i === numSimulados - 1) ? total : (i + 1) * SIMULADO_SIZE;
    const count = end - start + 1;
    const btn = document.createElement('button');
    btn.className = 'simulado-btn';
    btn.innerHTML = `
      <span class="simulado-num">Simulado ${i + 1}</span>
      <span class="simulado-count">${count} perguntas</span>
    `;
    btn.addEventListener('click', () => startSession(i));
    container.appendChild(btn);
  }
}

// ── Start ──
function startSession(simuladoIndex) {
  if (SIMULADO_MODE && simuladoIndex !== undefined) {
    currentSimulado = simuladoIndex;
    const total = quizData.length;
    const numSimulados = Math.max(1, Math.floor(total / SIMULADO_SIZE));
    const start = simuladoIndex * SIMULADO_SIZE;
    const end = (simuladoIndex === numSimulados - 1) ? total : (simuladoIndex + 1) * SIMULADO_SIZE;
    sessionQuestions = quizData.slice(start, end);
  } else {
    currentSimulado = null;
    shuffle(quizData);
    sessionQuestions = quizData.slice(0, SESSION_SIZE);
  }

  currentQuestion = 0;
  correctAnswers = 0;
  feedbackShown = false;
  el.incorrectDisplay.textContent = '—';
  el.incorrectDisplay.parentElement.className = 'score-badge';
  el.livePercent.textContent = '—';
  el.livePercent.parentElement.className = 'score-badge';
  el.ringFill.style.strokeDashoffset = 314;

  if (INDEX_MODE) {
    questionStates = sessionQuestions.map(() => ({ answered: false, selectedIndices: [], isCorrect: false }));
    const grid = document.getElementById('indexGrid');
    if (grid) grid.classList.add('open');
    const icon = document.querySelector('.index-toggle-icon');
    if (icon) icon.classList.add('rotated');
  }

  showScreen('quiz');
  renderQuestion();
}

el.startBtn.addEventListener('click', () => startSession());

// ── Render question ──
function renderQuestion() {
  feedbackShown = false;
  const q = sessionQuestions[currentQuestion];
  const total = sessionQuestions.length;
  const state = INDEX_MODE ? questionStates[currentQuestion] : null;

  el.questionTag.textContent = SIMULADO_MODE && currentSimulado !== null
    ? `Simulado ${currentSimulado + 1} · Pergunta ${currentQuestion + 1}`
    : `Pergunta ${currentQuestion + 1}`;
  el.questionCounter.textContent = `${currentQuestion + 1} / ${total}`;

  if (INDEX_MODE) {
    const answeredCount = questionStates.filter(s => s.answered).length;
    el.progressBar.style.width = `${(answeredCount / total) * 100}%`;
  } else {
    el.progressBar.style.width = `${((currentQuestion) / total) * 100}%`;
  }

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

  if (state && state.answered) {
    feedbackShown = true;
    const correctIndices = Array.isArray(q.correct) ? q.correct : [q.correct];

    document.querySelectorAll('.answer').forEach(a => {
      const idx = parseInt(a.dataset.index);
      if (state.selectedIndices.includes(idx)) a.classList.add('selected');
      if (correctIndices.includes(idx)) a.classList.add('correct');
      if (state.selectedIndices.includes(idx) && !correctIndices.includes(idx)) a.classList.add('incorrect');
      a.classList.add('disabled');
    });

    showFeedback(state.isCorrect, q, correctIndices);

    const allDone = questionStates.every(s => s.answered);
    el.nextBtn.style.display = 'inline-flex';
    el.nextBtn.querySelector('.btn-text').textContent = allDone ? 'Ver Resultado' : 'Próxima';
  } else {
    hideFeedback();
    el.nextBtn.style.display = 'none';
    el.nextBtn.querySelector('.btn-text').textContent = 'Confirmar';
  }

  if (INDEX_MODE) renderIndex();
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
    if (!INDEX_MODE) correctAnswers++;
    showFeedback(true);
  } else {
    showFeedback(false, q, q.multiple ? q.correct : [Array.isArray(q.correct) ? q.correct[0] : q.correct]);
  }

  if (INDEX_MODE) {
    questionStates[currentQuestion] = { answered: true, selectedIndices: [...selectedIndices], isCorrect };
    correctAnswers = questionStates.filter(s => s.isCorrect).length;
    const answeredCount = questionStates.filter(s => s.answered).length;
    const pctSoFar = Math.round((correctAnswers / answeredCount) * 100);
    el.incorrectDisplay.textContent = `${100 - pctSoFar}%`;
    el.incorrectDisplay.parentElement.className = 'score-badge score-badge--fail';
    el.livePercent.textContent = `${pctSoFar}%`;
    el.livePercent.parentElement.className = 'score-badge score-badge--pass';
    el.progressBar.style.width = `${(answeredCount / sessionQuestions.length) * 100}%`;
    renderIndex();
    const allDone = answeredCount === sessionQuestions.length;
    el.nextBtn.querySelector('.btn-text').textContent = allDone ? 'Ver Resultado' : 'Próxima';
  } else {
    const answeredSoFar = currentQuestion + 1;
    const pctSoFar = Math.round((correctAnswers / answeredSoFar) * 100);
    el.incorrectDisplay.textContent = `${100 - pctSoFar}%`;
    el.incorrectDisplay.parentElement.className = 'score-badge score-badge--fail';
    el.livePercent.textContent = `${pctSoFar}%`;
    el.livePercent.parentElement.className = 'score-badge score-badge--pass';
    el.nextBtn.querySelector('.btn-text').textContent =
      currentQuestion < sessionQuestions.length - 1 ? 'Próxima' : 'Ver Resultado';
  }

  feedbackShown = true;
}

function advance() {
  if (INDEX_MODE) {
    const total = sessionQuestions.length;
    let nextIdx = -1;

    for (let i = currentQuestion + 1; i < total; i++) {
      if (!questionStates[i].answered) { nextIdx = i; break; }
    }
    if (nextIdx === -1) {
      for (let i = 0; i < currentQuestion; i++) {
        if (!questionStates[i].answered) { nextIdx = i; break; }
      }
    }

    if (nextIdx === -1) {
      showResult();
    } else {
      navigateTo(nextIdx);
    }
    return;
  }

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

  if (INDEX_MODE) {
    correctAnswers = questionStates.filter(s => s.isCorrect).length;
  }

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
el.restartBtn.addEventListener('click', () => startSession(currentSimulado !== null ? currentSimulado : undefined));

el.backHomeBtn.addEventListener('click', () => {
  el.ringFill.style.strokeDashoffset = 314;
  showScreen('start');
});

// ── Index toggle ──
if (INDEX_MODE) {
  const toggleBtn = document.getElementById('toggleIndexBtn');
  const indexGrid = document.getElementById('indexGrid');
  const toggleIcon = document.querySelector('.index-toggle-icon');

  if (toggleBtn && indexGrid) {
    toggleBtn.addEventListener('click', () => {
      indexGrid.classList.toggle('open');
      if (toggleIcon) toggleIcon.classList.toggle('rotated');
    });
  }
}
