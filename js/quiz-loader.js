document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('quizSelect');
  const qEl = document.getElementById('tv-question');
  const optsEl = document.getElementById('tv-options');
  const feedbackEl = document.getElementById('tv-feedback');
  const progressEl = document.getElementById('tv-progress');
  const nextBtn = document.getElementById('tv-next');
  const resultsEl = document.getElementById('tv-results');

  let quizData = [];
  let idx = 0, score = 0;

  function showError(msg) {
    progressEl.textContent = "⚠️ பிழை: " + msg;
    feedbackEl.style.display = "block";
    feedbackEl.innerHTML = `<pre style="white-space:pre-wrap;color:#a00;">${msg}</pre>`;
  }

  // 🔹 quiz-list.json ஏற்றுதல்
  try {
    const resp = await fetch("quiz-list.json", { cache: "no-cache" });
    if (!resp.ok) throw new Error(`quiz-list.json ஏற்ற இயலவில்லை (${resp.status})`);
    const quizList = await resp.json();

    quizList.forEach(q => {
      const opt = document.createElement("option");
      opt.value = q.file;
      opt.textContent = q.title;
      select.appendChild(opt);
    });

    progressEl.textContent = "🧠 வினாடி–வினா தொகுப்பைத் தேர்ந்தெடுக்கவும்";
  } catch (e) {
    showError(e.message);
    console.error(e);
    return;
  }

  select.addEventListener("change", () => loadQuiz(select.value));

  // 🔹 தேர்ந்தெடுக்கப்பட்ட வினாடி–வினா JSON ஏற்றுதல்
  async function loadQuiz(file) {
    try {
      const res = await fetch(file, { cache: "no-cache" });
      if (!res.ok) throw new Error(`வினாடி–வினா கோப்பை ஏற்ற இயலவில்லை (${res.status})`);
      const data = await res.json();
      quizData = data.questions || data;
      if (!quizData.length) throw new Error("கோப்பில் வினாக்கள் இல்லை.");
      idx = 0; score = 0;
      renderQuestion();
    } catch (err) {
      showError(err.message);
      console.error(err);
    }
  }

  // 🔹 வினா காட்சி
  function renderQuestion() {
    const q = quizData[idx];
    const options = q.options || (q.answerOptions ? q.answerOptions.map(o => o.text) : []);
    const correctIndex = typeof q.answer === "number"
      ? q.answer
      : (q.answerOptions ? q.answerOptions.findIndex(a => a.isCorrect) : 0);

    progressEl.textContent = `வினா ${idx + 1} / ${quizData.length}`;
    qEl.textContent = q.question || q.questionText || "வினா காணப்படவில்லை.";
    optsEl.innerHTML = "";
    feedbackEl.style.display = "none";
    nextBtn.style.display = "none";

    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.style.cssText = "padding:10px;margin:6px 0;width:100%;text-align:left;border-radius:8px;border:1px solid #ccc;background:#f9f9f9;";
      btn.onclick = () => checkAnswer(i, correctIndex, q);
      optsEl.appendChild(btn);
    });
  }

  // 🔹 பதில் சரிபார்த்தல்
  function checkAnswer(i, correct, q) {
    const buttons = optsEl.querySelectorAll("button");
    buttons.forEach(b => (b.disabled = true));
    const exp = q.explanation || (q.answerOptions && q.answerOptions[correct]?.rationale);

    if (i === correct) {
      score++;
      feedbackEl.innerHTML = `<div style='color:green;font-weight:700;'>✅ சரியான விடை!</div>`;
    } else {
      feedbackEl.innerHTML = `<div style='color:red;font-weight:700;'>❌ தவறான விடை.</div>`;
      if (buttons[correct]) buttons[correct].style.background = "#e6f7e9";
    }

    if (exp) feedbackEl.innerHTML += `<div style='margin-top:8px;color:#333;'>${exp}</div>`;
    feedbackEl.style.display = "block";

    nextBtn.style.display = "block";
    nextBtn.textContent = idx < quizData.length - 1 ? "அடுத்த வினா" : "முடிவு காண்";
  }

  // 🔹 அடுத்த வினா
  nextBtn.addEventListener("click", () => {
    idx++;
    if (idx < quizData.length) renderQuestion();
    else showResults();
  });

  // 🔹 முடிவுகள்
  function showResults() {
    qEl.textContent = "";
    optsEl.innerHTML = "";
    feedbackEl.style.display = "none";
    progressEl.textContent = "";
    nextBtn.style.display = "none";
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `
      <h3 style='color:#0a58ca;'>🎉 வினாடி–வினா முடிந்தது!</h3>
      <p><b>மதிப்பெண்:</b> ${score} / ${quizData.length}</p>
      <p><b>சதவீதம்:</b> ${(score / quizData.length * 100).toFixed(1)}%</p>
      <button onclick="location.reload()" style="padding:8px 16px;background:#28a745;color:#fff;border:none;border-radius:6px;cursor:pointer;">மீண்டும் முயற்சி</button>`;
  }
});
