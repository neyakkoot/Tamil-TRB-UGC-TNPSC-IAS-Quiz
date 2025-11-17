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

  let noteEl = document.getElementById("tv-note");
  if (!noteEl) {
    noteEl = document.createElement("div");
    noteEl.id = "tv-note";
    noteEl.setAttribute("role", "status");
    noteEl.style.marginTop = "0.5rem";
    if (resultsEl && resultsEl.parentNode) {
      resultsEl.parentNode.insertBefore(noteEl, resultsEl.nextSibling);
    } else {
      // app-container இருப்பதைக் கருதி, அதற்குள் சேர்க்கவும்
      const appContainer = document.getElementById('app-container');
      if (appContainer) {
         appContainer.appendChild(noteEl);
      } else {
         document.body.appendChild(noteEl);
      }
    }
    console.warn("tv-note not found — created fallback element.");
  }

  if (!quizSelect || !progressEl || !qEl || !optsEl || !feedbackEl || !resultsEl || !prevBtn || !nextBtn) {
    console.error("Required UI element missing:", {
      quizSelect, progressEl, qEl, optsEl, feedbackEl, resultsEl, prevBtn, nextBtn
    });
    if (progressEl) progressEl.textContent = "⚠️ UI elements இல்லை — பக்கம் சரிபார்க்கவும்.";
    return;
  }

  let quizData = [];
  let idx = 0;
  let score = 0;
  // --- 👑 புதிய மாறி: வினாடி-வினாவின் தலைப்பைச் சேமிக்க 👑 ---
  let currentQuizTitle = '';

  // 🔹 Load quiz list (Categorized)
  async function loadQuizList() {
    try {
      const res = await fetch("quiz-list.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("quiz-list.json not found");
      
      const list = await res.json(); 

      list.forEach(categoryItem => {
        const optGroup = document.createElement("optgroup");
        optGroup.label = categoryItem.category; 

        categoryItem.quizzes.forEach(quizItem => {
          const opt = document.createElement("option");
          opt.value = quizItem.file;
          opt.textContent = quizItem.title;
          optGroup.appendChild(opt);
        });
        
        quizSelect.appendChild(optGroup);
      });

      console.log("✅ Categorized quiz list loaded");
    } catch (err)
 {
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

      // --- 👑 புதிய மாற்றம்: தலைப்பைச் சேமி 👑 ---
      // தேர்ந்தெடுக்கப்பட்ட <option> இன் உரையையே (text) தலைப்பாகப் பெறு
      currentQuizTitle = quizSelect.options[quizSelect.selectedIndex].text;

      // index.html இல் உள்ள startQuizTimer() செயல்பாட்டை அழைக்கவும்
      if (typeof startQuizTimer === 'function') {
        startQuizTimer(quizData.length);
      } else {
        console.warn("startQuizTimer function not found. Is index.html updated?");
      }

      idx = 0;
      score = 0;
      qEl.style.display = "";
      optsEl.style.display = "";
      renderQuestion();
      
      // முடிவுகள் பகுதியையும், வினா-விடை பகுதியையும் மறை (புதிய பயிற்சி தொடங்கும் போது)
      const customResults = document.getElementById("tv-results");
      if (customResults) customResults.style.display = "none";
      document.getElementById('tv-progress').style.display = 'block';
      document.getElementById('tv-question').style.display = 'block';
      document.getElementById('tv-options').innerHTML = '';


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
    if (typeof showCustomResults === 'function') {
      // --- 👑 புதிய மாற்றம்: தலைப்பை அனுப்பு 👑 ---
      showCustomResults(score, quizData.length, currentQuizTitle);
    } else {
      console.error("showCustomResults function not found! Cannot display results.");
      resultsEl.style.display = "block";
      resultsEl.innerHTML = `<h3>மதிப்பெண்: ${score} / ${quizData.length}</h3>
                             <p>முடிவுகளைக் காட்டுவதில் பிழை.</p>`;
    }
  }

  // 🔹 Quiz selection
  quizSelect.addEventListener("change", e => {
    // பயனர் "select..." என்பதைத் தேர்ந்தெடுக்கவில்லை என்பதை உறுதிப்படுத்தவும்
    if (e.target.value) {
      loadQuiz(e.target.value);
    }
  });

  // Start (பயனர் உள்நுழைந்ததும் இது செயல்படும்)
  loadQuizList();
});
