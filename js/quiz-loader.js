// js/quiz-loader.js
// Safe, defensive quiz loader — Tamil comments included.

document.addEventListener('DOMContentLoaded', () => {
  // Elements (nullable checks below)
  const quizSelect = document.getElementById('quizSelect');
  const progressEl = document.getElementById('tv-progress');
  const questionEl = document.getElementById('tv-question');
  const optionsEl = document.getElementById('tv-options');
  const feedbackEl = document.getElementById('tv-feedback'); // noteEl equivalent
  const prevBtn = document.getElementById('tv-prev');
  const nextBtn = document.getElementById('tv-next');
  const resultsEl = document.getElementById('tv-results');

  // Defensive: ensure required elements exist, otherwise log and stop gracefully.
  if (!quizSelect || !progressEl || !questionEl || !optionsEl) {
    console.error('Required quiz element(s) missing. Check HTML element IDs.');
    if (feedbackEl) feedbackEl.style.display = 'block', feedbackEl.innerText = 'உள்ளமைப்புப் பிழை: குறைந்தது ஒரு HTML எலமென்ட் காணப்படவில்லை (check console).';
    return;
  }

  // Ensure feedbackEl (noteEl) exists — if not, create a small fallback element so code can set innerHTML safely.
  let noteEl = feedbackEl;
  if (!noteEl) {
    noteEl = document.createElement('div');
    noteEl.id = 'tv-feedback';
    noteEl.style.display = 'none';
    noteEl.style.marginTop = '14px';
    noteEl.style.padding = '12px';
    noteEl.style.borderRadius = '8px';
    noteEl.style.background = '#f9f9f9';
    noteEl.style.border = '1px solid #ddd';
    // place fallback after tv-options if present, otherwise append to body
    if (optionsEl.parentNode) optionsEl.parentNode.insertBefore(noteEl, optionsEl.nextSibling);
    else document.body.appendChild(noteEl);
  }

  // State
  let quizzes = []; // array of quiz sets
  let currentQuiz = null;
  let currentIndex = 0;
  let score = 0;
  let userAnswers = [];

  // Utility to show messages in noteEl safely
  function showNote(htmlOrText, { asHtml = false, autoShow = true } = {}) {
    if (!noteEl) return;
    if (asHtml) noteEl.innerHTML = htmlOrText;
    else noteEl.textContent = htmlOrText;
    if (autoShow) noteEl.style.display = 'block';
  }
  function hideNote() { if (noteEl) noteEl.style.display = 'none'; }

  // Load quizzes JSON (defensive)
  // Default path can be changed — ensure you host a valid JSON file at this path.
  const QUIZ_JSON_PATH = 'data/quizzes.json';

  async function loadQuizzes() {
    try {
      const resp = await fetch(QUIZ_JSON_PATH, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`Network response not ok: ${resp.status}`);
      const text = await resp.text();
      // Defensive JSON parse
      if (!text || text.trim().length === 0) throw new Error('Quizzes file is empty.');
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        // Provide helpful debugging for unexpected end of JSON input
        console.error('JSON parse error:', err);
        showNote('JSON parse பிழை: உங்கள் data/quizzes.json கோப்பு தவறானதாக உள்ளது. Console-ஐப் பார்.', { asHtml: false });
        return;
      }
      // Expecting an array or object with sets
      if (!Array.isArray(parsed) && typeof parsed !== 'object') {
        showNote('Quizzes JSON unexpected format.', { asHtml: false });
        return;
      }
      // Normalize to array of sets
      if (Array.isArray(parsed)) quizzes = parsed;
      else if (parsed.sets && Array.isArray(parsed.sets)) quizzes = parsed.sets;
      else {
        // If object keyed by ids, transform it
        quizzes = Object.keys(parsed).map(k => {
          const item = parsed[k];
          if (!item.title) item.title = k;
          return item;
        });
      }

      if (!quizzes.length) {
        showNote('Quizzes கிடைக்கவில்லை — JSON வெறுமை அல்லது தவறான அமைப்பு.', { asHtml: false });
        return;
      }

      populateQuizSelect();
      showNote('டேட்டா ஏற்றம் வெற்றிகரம். தொகுப்பை தேர்ந்தெடுக்கவும்.', { asHtml: false });
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      showNote('Quizzes ஏற்றத்தில் தவறு: ' + err.message, { asHtml: false });
    }
  }

  function populateQuizSelect() {
    // Clear existing options except the first placeholder
    // Keep the first placeholder if present
    // Remove all other options after index 0
    while (quizSelect.options.length > 1) quizSelect.remove(1);

    quizzes.forEach((qset, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = qset.title || `தொகுப்பு ${idx + 1}`;
      quizSelect.appendChild(opt);
    });

    // Show next/prev only after selection
    quizSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '') return;
      loadQuiz(Number(val));
    });
  }

  function loadQuiz(index) {
    if (!quizzes[index]) {
      showNote('தேர்ந்தெடுக்கப்பட்ட தொகுப்பு காணவில்லை.', { asHtml: false });
      return;
    }
    currentQuiz = quizzes[index];
    currentIndex = 0;
    score = 0;
    userAnswers = [];
    resultsEl.style.display = 'none';
    hideNote();
    renderQuestion();
    // show navigation
    if (prevBtn) prevBtn.style.display = 'inline-block';
    if (nextBtn) nextBtn.style.display = 'inline-block';
  }

  function renderQuestion() {
    if (!currentQuiz) return;
    const questions = currentQuiz.questions || currentQuiz.items || [];
    if (!questions.length) {
      showNote('இந்த தொகுப்பில் வினாக்கள் இல்லை.', { asHtml: false });
      return;
    }
    const q = questions[currentIndex];
    // Update progress
    progressEl.textContent = `வினா ${currentIndex + 1} / ${questions.length}`;

    // Render question text (safe)
    questionEl.textContent = q.question || q.prompt || 'வினா இல்லை';

    // Render options
    optionsEl.innerHTML = ''; // clear
    const opts = q.options || q.choices || [];
    if (!opts.length) {
      // If single-answer response-type quiz, still show a note
      const p = document.createElement('p');
      p.textContent = 'வினாக்குக் கண்டறியப்படும் தேர்வுகள் இல்லை.';
      optionsEl.appendChild(p);
      return;
    }

    opts.forEach((optText, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.dataset.index = i;
      btn.textContent = optText;
      btn.addEventListener('click', () => handleAnswer(i));
      optionsEl.appendChild(btn);
    });
  }

  function handleAnswer(selectedIndex) {
    if (!currentQuiz) return;
    const questions = currentQuiz.questions || currentQuiz.items || [];
    const q = questions[currentIndex];
    const correct = q.answer; // could be index (number) or value (string)
    const optionBtns = Array.from(optionsEl.querySelectorAll('.option-btn'));

    // Prevent multiple clicks on same question
    if (optionBtns.some(b => b.disabled)) return;

    // Determine correctness
    let isCorrect = false;
    if (typeof correct === 'number') {
      isCorrect = (correct === selectedIndex);
    } else if (typeof correct === 'string') {
      isCorrect = (String(q.options ? q.options[selectedIndex] : '') === correct) || (String(selectedIndex) === correct);
    } else if (Array.isArray(correct)) {
      // multiple-correct indices
      isCorrect = correct.includes(selectedIndex);
    }

    // Mark buttons
    optionBtns.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === selectedIndex) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      }
      // Optionally mark correct option
      if (typeof correct === 'number' && idx === correct) btn.classList.add('correct');
      if (Array.isArray(correct) && correct.includes(idx)) btn.classList.add('correct');
    });

    // Save answer and update score
    userAnswers[currentIndex] = { selected: selectedIndex, correct: isCorrect };
    if (isCorrect) score += 1;

    // Show feedback safely
    const feedbackText = isCorrect ? 'சரி! 👏' : (`தவறு. சரியான பதில்: ${formatCorrectAnswer(q)}`);
    showNote(feedbackText, { asHtml: false });

    // Auto-enable next button if present
    if (nextBtn) nextBtn.disabled = false;
  }

  function formatCorrectAnswer(q) {
    if (!q) return '';
    if (typeof q.answer === 'number') {
      const opts = q.options || [];
      return opts[q.answer] || `#${q.answer + 1}`;
    } else if (Array.isArray(q.answer)) {
      const opts = q.options || [];
      return q.answer.map(i => opts[i] || `#${i + 1}`).join(', ');
    } else if (typeof q.answer === 'string') return q.answer;
    return '';
  }

  // Navigation
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!currentQuiz) return;
      if (currentIndex > 0) {
        currentIndex--;
        hideNote();
        renderQuestion();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!currentQuiz) return;
      const questions = currentQuiz.questions || currentQuiz.items || [];
      if (currentIndex < questions.length - 1) {
        currentIndex++;
        hideNote();
        renderQuestion();
      } else {
        // Show results
        showResults();
      }
    });
    // Initially disable until first answer (optional)
    nextBtn.disabled = false;
  }

  function showResults() {
    if (!currentQuiz) return;
    const total = (currentQuiz.questions || currentQuiz.items || []).length;
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `<h3>முடிவு</h3><p>மொத்தம்: ${total} | சரியானவை: ${score}</p>`;
    // Optionally show per-question summary
    const ul = document.createElement('ul');
    (currentQuiz.questions || currentQuiz.items || []).forEach((q, i) => {
      const li = document.createElement('li');
      const ua = userAnswers[i];
      const text = q.question ? q.question : `Q${i+1}`;
      li.textContent = `${i+1}. ${text} — பதில்: ${ua ? (ua.correct ? 'சரியானது' : 'தவறு') : 'கிடையவில்லை'}`;
      ul.appendChild(li);
    });
    resultsEl.appendChild(ul);
  }

  // Kick off load
  loadQuizzes();

  // OPTIONAL: If you prefer inline quiz data (no fetch), uncomment below and adjust structure:
  /*
  quizzes = [
    {
      title: 'உதாரணம்',
      questions: [
        { question: '1 + 1 = ?', options: ['1','2','3'], answer: 1 },
        { question: 'தமிழ் தலைநகர்?', options: ['சென்னை','மும்பை'], answer: 0 }
      ]
    }
  ];
  populateQuizSelect();
  */
});
