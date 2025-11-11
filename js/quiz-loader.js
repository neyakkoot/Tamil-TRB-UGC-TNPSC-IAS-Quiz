// js/quiz-loader.js
document.addEventListener("DOMContentLoaded", function () {
  const quizSelect = document.getElementById("quizSelect");
  const progressEl = document.getElementById("tv-progress");
  const qEl = document.getElementById("tv-question");
  const optsEl = document.getElementById("tv-options");
  const feedbackEl = document.getElementById("tv-feedback");
  const resultsEl = document.getElementById("tv-results");
  const prevBtn = document.getElementById("tv-prev");
  const nextBtn = document.getElementById("tv-next");

  // Attempt to get tv-note; if missing, create and insert it after resultsEl (or at end of body)
  let noteEl = document.getElementById("tv-note");
  if (!noteEl) {
    noteEl = document.createElement("div");
    noteEl.id = "tv-note";
    noteEl.setAttribute("role", "status");
    noteEl.style.marginTop = "0.5rem";
    // place it logically: after resultsEl if exists, otherwise append to body
    if (resultsEl && resultsEl.parentNode) {
      resultsEl.parentNode.insertBefore(noteEl, resultsEl.nextSibling);
    } else {
      document.body.appendChild(noteEl);
    }
    console.warn("tv-note not found — created fallback element.");
  }

  // Basic guards: if any of the main UI elements are missing, log and stop
  if (!quizSelect || !progressEl || !qEl || !optsEl || !feedbackEl || !resultsEl || !prevBtn || !nextBtn) {
    console.error("Required UI element missing:", {
      quizSelect, progressEl, qEl, optsEl, feedbackEl, resultsEl, prevBtn, nextBtn
    });
    // show friendly message if progressEl exists
    if (progressEl) progressEl.textContent = "⚠️ UI elements இல்லை — பக்கம் சரிபார்க்கவும்.";
    return;
  }

  let quizData = [];
  let idx = 0;
  let score = 0;

  // 🔹 Load quiz list
  async function loadQuizList() {
    try {
      const res = await fetch("quiz-list.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("quiz-list.json not found");
      const list = await res.json();
      list.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item.file;
        opt.textContent = item.title;
        quizSelect.appendChild(opt);
      });
      console.log("✅ Quiz list loaded");
    } catch (err) {
      console.error("❌ Error loading quiz list:", err);
      progressEl.textContent = "⚠️ வினாடி–வினா பட்டியல் ஏற்ற முடியவில்லை!";
    }
  }

  // 🔹 Load quiz questions
  async function loadQuiz(file) {
    try {
      const res = await fetch(file, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${file} not found`);
      const data = await res.json();
      quizData = data.questions || data;
      if (!quizData || !quizData.length) throw new Error("No questions found");
      idx = 0;
      score = 0;
      qEl.style.display = "";
      optsEl.style.display = "";
      renderQuestion();
      resultsEl.style.display = "none";
      console.log(`📘 Quiz loaded: ${file}`);
    } catch (err) {
      console.error("Quiz load error:", err);
      progressEl.textContent = "⚠️ வினாக்களை ஏற்ற முடியவில்லை: " + err.message;
    }
  }

  // 🔹 Render question
  function renderQuestion() {
    const q = quizData[idx];
    if (!q) {
      progressEl.textContent = "⚠️ செல்லுபடியாகாத வினா.";
      return;
    }

    progressEl.textContent = `வினா ${idx + 1} / ${quizData.length}`;
    qEl.textContent = q.question || "வினா கிடைக்கவில்லை.";
    optsEl.innerHTML = "";
    feedbackEl.style.display = "none";
    nextBtn.style.display = "inline-block";
    prevBtn.style.display = idx > 0 ? "inline-block" : "none";

    // safe write to noteEl
    if (noteEl) noteEl.innerHTML = "🧾 வினாவை படித்து சரியான விடையைத் தேர்ந்தெடுக்கவும்.";

    const options = q.answerOptions || q.options || [];
    if (!options.length) {
      optsEl.innerHTML = "<p>விருப்பங்கள் இல்லை.</p>";
      return;
    }

    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.innerHTML = `<strong>${["(அ)", "(ஆ)", "(இ)", "(ஈ)", "(உ)"][i] || (i + 1)}.</strong> ${
        typeof opt === "string" ? opt : opt.text || ""
      }`;
      btn.onclick = () => selectAnswer(i, btn);
      optsEl.appendChild(btn);
    });
  }

  // 🔹 Select answer
  function selectAnswer(choice, btn) {
    const q = quizData[idx];
    if (!q) return;
    const correctIndex =
      typeof q.answer === "number"
        ? q.answer
        : (q.answerOptions?.findIndex(o => o.isCorrect) ?? 0);

    const buttons = optsEl.querySelectorAll("button");
    buttons.forEach(b => (b.disabled = true));

    if (choice === correctIndex) {
      score++;
      btn.classList.add("correct");
      if (noteEl) noteEl.innerHTML = "✅ சரியான விடை!";
    } else {
      btn.classList.add("wrong");
      if (buttons[correctIndex]) buttons[correctIndex].classList.add("correct");
      if (noteEl) noteEl.innerHTML = "❌ தவறான விடை.";
    }

    const explanation =
      q.explanation ||
      q.answerOptions?.[correctIndex]?.rationale ||
      "விளக்கம் வழங்கப்படவில்லை.";
    feedbackEl.style.display = "block";
    feedbackEl.innerHTML = `<strong>விளக்கம்:</strong> ${explanation}`;
  }

  // 🔹 Navigation buttons
  nextBtn.addEventListener("click", () => {
    if (idx < quizData.length - 1) {
      idx++;
      renderQuestion();
    } else {
      showResults();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (idx > 0) {
      idx--;
      renderQuestion();
    }
  });

  // 🔹 Results screen
  function showResults() {
    qEl.style.display = "none";
    optsEl.style.display = "none";
    feedbackEl.style.display = "none";
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    if (noteEl) noteEl.innerHTML = "🎯 வினாடி–வினா முடிந்தது!";
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `
      <h3>மதிப்பெண்: ${score} / ${quizData.length}</h3>
      <p>சதவீதம்: <strong>${((score / quizData.length) * 100).toFixed(1)}%</strong></p>
      <button id="retryBtn">மீண்டும் முயற்சி</button>
    `;
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) {
      retryBtn.onclick = () => {
        idx = 0;
        score = 0;
        qEl.style.display = "";
        optsEl.style.display = "";
        renderQuestion();
      };
    }
  }

  // 🔹 Quiz selection
  quizSelect.addEventListener("change", e => {
    loadQuiz(e.target.value);
  });

  // Start
  loadQuizList();
});
