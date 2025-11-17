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
    } catch (err) {
      console.error("❌ Error loading quiz list:", err);
      progressEl.textContent = "⚠️ மேம்படுத்தாத காரணத்தால் வினாடி–வினா பட்டியலை ஏற்ற முடியவில்லை! உருவாக்குநர் விரைந்து அதனைச் செய்வார். எனவே தாங்கள் பிறவற்றைத் தெரிவுசெய்து அறிவைச் சோதியுங்கள்.";
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

      // --- 👑 புதிய மாற்றம் 1: பதில்களை Reset செய் 👑 ---
      // ஒவ்வொரு வினாவிற்கும் பயனரின் பதிலைச் சேமிக்க ஒரு இடம் உருவாக்கப்படுகிறது.
      quizData.forEach(q => {
        q.userChoice = undefined; // 'undefined' என அமைத்தால், 0-வது விடையையும் சரியாகக் கையாளும்
      });
      // --- 👑 மாற்றம் 1 முடிவு 👑 ---

      currentQuizTitle = quizSelect.options[quizSelect.selectedIndex].text;

      if (typeof startQuizTimer === 'function') {
        startQuizTimer(quizData.length);
      } else {
        console.warn("startQuizTimer function not found. Is index.html updated?");
      }

      idx = 0;
      score = 0;
      
      const customResults = document.getElementById("tv-results");
      if (customResults) customResults.style.display = "none";
      document.getElementById('tv-progress').style.display = 'block';
      document.getElementById('tv-question').style.display = 'block';
      document.getElementById('tv-options').innerHTML = '';

      renderQuestion(); // renderQuestion ஐ இங்கே அழைக்கவும்
      console.log(`📘 Quiz loaded: ${file}`);

    } catch (err) {
      console.error("Quiz load error:", err);
      progressEl.textContent = "⚠️ இதற்குரிய வினாக்கள் இல்லை. அதனால் வினாக்களை ஏற்ற முடியவில்லை: " + err.message;
    }
  }

  // 🔹 Render question
  function renderQuestion() {
    const q = quizData[idx];
    if (!q) {
      progressEl.textContent = "⚠️ செல்லுபடியாகாத வினா.";
      return;
    }

    // --- 👑 புதிய மாற்றம் 2: பதிலளித்துவிட்டாரா எனச் சோதி 👑 ---
    const userChoice = q.userChoice; // சேமிக்கப்பட்ட பதிலை எடு
    const hasAnswered = (userChoice !== undefined);
    // --- 👑 மாற்றம் 2 முடிவு 👑 ---

    progressEl.textContent = `வினா ${idx + 1} / ${quizData.length}`;
    qEl.textContent = q.question || "வினா கிடைக்கவில்லை.";
    optsEl.innerHTML = "";
    nextBtn.style.display = "inline-block";
    prevBtn.style.display = idx > 0 ? "inline-block" : "none";

    const options = q.answerOptions || q.options || [];
    if (!options.length) {
      optsEl.innerHTML = "<p>விருப்பங்கள் இல்லை.</p>";
      return;
    }

    // சரியான விடையை முன்கூட்டியே கண்டறியவும்
    const correctIndex = typeof q.answer === "number"
        ? q.answer
        : (q.answerOptions?.findIndex(o => o.isCorrect) ?? 0);

    options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.innerHTML = `<strong>${["(அ)", "(ஆ)", "(இ)", "(ஈ)", "(உ)"][i] || (i + 1)}.</strong> ${
        typeof opt === "string" ? opt : opt.text || ""
      }`;

      // --- 👑 புதிய மாற்றம் 3: பொத்தான்களை முடக்கு (Lock) 👑 ---
      if (hasAnswered) {
        // ஏற்கனவே பதிலளித்திருந்தால், பொத்தானை முடக்கு
        btn.disabled = true;
        
        // சரியான விடையைக் காட்டு
        if (i === correctIndex) {
          btn.classList.add("correct");
        }
        // பயனர் அளித்த தவறான விடையைக் காட்டு
        if (i === userChoice && userChoice !== correctIndex) {
          btn.classList.add("wrong");
        }
      } else {
        // பதிலளிக்கவில்லை என்றால் மட்டும், 'onclick' செயல்பாட்டைச் சேர்
        btn.onclick = () => selectAnswer(i, btn);
      }
      // --- 👑 மாற்றம் 3 முடிவு 👑 ---

      optsEl.appendChild(btn);
    });

    // --- 👑 புதிய மாற்றம் 4: பின்னூட்டத்தை (Feedback) கையாளு 👑 ---
    if (hasAnswered) {
      // பதிலளித்திருந்தால், விளக்கத்தைக் காட்டு
      const explanation =
        q.explanation ||
        q.answerOptions?.[correctIndex]?.rationale ||
        "விளக்கம் வழங்கப்படவில்லை.";
      feedbackEl.style.display = "block";
      feedbackEl.innerHTML = `<strong>விளக்கம்:</strong> ${explanation}`;
      if (noteEl) noteEl.innerHTML = "✅❌ நீங்கள் ஏற்கனவே பதிலளித்த வினா இதுவாகும். எனவே மீண்டும் அதனைச் சொடுக்க இயலாது. இந்த வினாடி-வினாவை நிறைவுசெய்து, பின்பு மீண்டும் முயற்சிசெய்து நினைவாற்றலைப் பெருக்கிக் கொள்ளுங்கள்.";
    } else {
      // பதிலளிக்கவில்லை என்றால், விளக்கத்தை மறை
      feedbackEl.style.display = "none";
      if (noteEl) noteEl.innerHTML = "🧾 வினாவைப் படித்துச் சரியான விடையைத் தேர்ந்தெடுக்கவும்.";
    }
    // --- 👑 மாற்றம் 4 முடிவு 👑 ---
  }

  // 🔹 Select answer
  function selectAnswer(choice, btn) {
    const q = quizData[idx];
    
    // --- 👑 புதிய மாற்றம் 5: ஒருமுறை மட்டுமே பதிலளிக்க அனுமதி 👑 ---
    if (!q || q.userChoice !== undefined) {
      return; // ஏற்கனவே பதிலளித்திருந்தால், எதையும் செய்யாதே
    }
    
    // பயனர் அளித்த பதிலைச் சேமி
    q.userChoice = choice;
    // --- 👑 மாற்றம் 5 முடிவு 👑 ---

    const correctIndex =
      typeof q.answer === "number"
        ? q.answer
        : (q.answerOptions?.findIndex(o => o.isCorrect) ?? 0);

    const buttons = optsEl.querySelectorAll("button");
    buttons.forEach(b => (b.disabled = true)); // பதிலளித்ததும் அனைத்து பொத்தான்களையும் முடக்கு

    if (choice === correctIndex) {
      score++; // ஒருமுறை மட்டுமே மதிப்பெண் ஏறும்
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
    if (e.target.value) {
      loadQuiz(e.target.value);
    }
  });

  // Start
  loadQuizList();
});
