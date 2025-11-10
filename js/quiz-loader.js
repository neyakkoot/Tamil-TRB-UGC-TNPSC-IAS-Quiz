document.addEventListener("DOMContentLoaded", function() {
  const quizSelect = document.getElementById("quizSelect");
  const qEl = document.getElementById("tv-question");
  const optsEl = document.getElementById("tv-options");
  const progressEl = document.getElementById("tv-progress");
  const feedbackEl = document.getElementById("tv-feedback");
  const nextBtn = document.getElementById("tv-next");
  const resultsEl = document.getElementById("tv-results");
  const labels = ["(அ)", "(ஆ)", "(இ)", "(ஈ)", "(உ)"];
  let quizData = [], idx = 0, score = 0, currentQuizFile = "", currentQuizTitle = "";

  fetch("quiz-list.json").then(res => res.json()).then(list => {
    list.forEach(q => {
      const opt = document.createElement("option");
      opt.value = q.file;
      opt.textContent = q.title;
      quizSelect.appendChild(opt);
    });
  });

  quizSelect.addEventListener("change", async (e) => {
    currentQuizFile = e.target.value;
    const res = await fetch(currentQuizFile);
    const data = await res.json();
    quizData = data.questions || data;
    idx = 0; score = 0;
    renderQuestion();
  });

  function renderQuestion() {
    const q = quizData[idx];
    progressEl.textContent = `வினா ${idx+1} / ${quizData.length}`;
    qEl.textContent = q.question;
    optsEl.innerHTML = "";
    feedbackEl.style.display = "none";
    nextBtn.style.display = "none";
    resultsEl.style.display = "none";

    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.style.cssText = "padding:12px;border-radius:8px;border:1px solid #ddd;background:#f9f9f9;text-align:left;cursor:pointer;font-size:1rem;";
      btn.innerHTML = `<strong>${labels[i]}</strong> ${opt}`;
      btn.onclick = () => selectAnswer(i, btn);
      optsEl.appendChild(btn);
    });
  }

  function selectAnswer(choice, btn) {
    const q = quizData[idx];
    const correct = q.answer;
    const buttons = optsEl.querySelectorAll("button");
    buttons.forEach(b => b.disabled = true);

    if (choice === correct) {
      score++;
      btn.style.background = "#e6f7e9";
      btn.style.borderColor = "#28a745";
    } else {
      btn.style.background = "#fdecea";
      btn.style.borderColor = "#dc3545";
      buttons[correct].style.background = "#e6f7e9";
      buttons[correct].style.borderColor = "#28a745";
    }

    feedbackEl.style.display = "block";
    feedbackEl.innerHTML = (choice === correct ? "✅ சரியான விடை!" : "❌ தவறான விடை.") + `<div>${q.explanation}</div>`;
    nextBtn.style.display = "block";
  }

  nextBtn.addEventListener("click", function() {
    idx++;
    if (idx < quizData.length) {
      renderQuestion();
    } else {
      showResults();
    }
  });

  function showResults() {
    qEl.style.display = "none";
    optsEl.style.display = "none";
    feedbackEl.style.display = "none";
    nextBtn.style.display = "none";

    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<h3>வினாடி–வினா முடிந்தது!</h3><div>மதிப்பெண்: ${score} / ${quizData.length}</div><div>சதவீதம்: ${(score/quizData.length*100).toFixed(1)}%</div><button id='retryBtn'>மீண்டும் முயற்சிக்க</button>`;
    saveScore(currentQuizFile, score, quizData.length, quizSelect.options[quizSelect.selectedIndex].text);

    document.getElementById("retryBtn").onclick = () => {
      idx = 0; score = 0;
      qEl.style.display = ""; optsEl.style.display = ""; renderQuestion();
    };
  }
});
