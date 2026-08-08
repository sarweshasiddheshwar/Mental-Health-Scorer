/* =========================================================
   MENTAL WELLNESS — A PEACEFUL MOUNTAIN RETREAT
   Vanilla JS: animations, form handling, API integration
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     0. CONFIG — keep the backend contact points in one place
     --------------------------------------------------------- */
  const API_URL = "http://127.0.0.1:8000";
  const PREDICT_PATH = "/predict";

  // The backend (main.py) only returns `predicted_mental_health_score`
  // as a raw float — it does not define a min/max range. 78.4 in the
  // brief's own mockup suggests a 0–100 scale, so that's the default
  // used to draw the gauge. If your model was trained on a different
  // scale (e.g. 0–10), just change SCORE_MAX below — everything else
  // (the exact number shown, the gauge fill %, the scene chosen)
  // will adjust automatically.
  const SCORE_MAX = 100;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------
     1. AMBIENT FLOATING LEAVES
     --------------------------------------------------------- */
  function initLeaves() {
    const layer = document.getElementById("leafLayer");
    if (!layer || prefersReducedMotion) return;

    const LEAF_COUNT = 9;
    const glyphs = ["🍃", "🌿", "🍂"];

    for (let i = 0; i < LEAF_COUNT; i++) {
      const leaf = document.createElement("span");
      leaf.className = "leaf";
      leaf.textContent = glyphs[i % glyphs.length];
      leaf.style.left = Math.random() * 100 + "vw";
      leaf.style.fontSize = 1 + Math.random() * 0.9 + "rem";
      leaf.style.setProperty("--drift-x", 40 + Math.random() * 120 + "px");
      leaf.style.animationDuration = 14 + Math.random() * 12 + "s";
      leaf.style.animationDelay = -(Math.random() * 20) + "s";
      layer.appendChild(leaf);
    }
  }

  /* ---------------------------------------------------------
     2. SCROLL-TRIGGERED FADE-INS
     --------------------------------------------------------- */
  function initFadeIns() {
    const targets = document.querySelectorAll(".fade-in");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("fade-in--visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------
     3. GENTLE PARALLAX ON THE HERO MOUNTAINS
     --------------------------------------------------------- */
  function initParallax() {
    if (prefersReducedMotion) return;
    const hero = document.getElementById("hero");
    if (!hero) return;

    const layers = hero.querySelectorAll("[data-depth]");
    let ticking = false;

    function update() {
      const scrollY = window.scrollY;
      layers.forEach((layer) => {
        const depth = parseFloat(layer.getAttribute("data-depth")) || 0.1;
        layer.style.transform = `translateY(${scrollY * depth * 0.35}px)`;
      });
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------
     4. SMOOTH-SCROLL "BEGIN YOUR JOURNEY" BUTTONS
     --------------------------------------------------------- */
  function initScrollButtons() {
    const assessment = document.getElementById("assessment");
    const buttons = [
      document.getElementById("beginJourneyBtn"),
      document.getElementById("topbarCta"),
    ];
    buttons.forEach((btn) => {
      if (!btn) return;
      btn.addEventListener("click", () => {
        assessment.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------------------------------------------------------
     5. FORM ELEMENTS
     --------------------------------------------------------- */
  const form = document.getElementById("wellnessForm");
  const ageInput = document.getElementById("age");
  const countrySelect = document.getElementById("country");
  const countryOtherInput = document.getElementById("countryOther");
  const academicLevelSelect = document.getElementById("academicLevel");
  const platformSelect = document.getElementById("platform");
  const purposeSelect = document.getElementById("purpose");
  const dailyUnlocksInput = document.getElementById("dailyUnlocks");
  const usageHoursInput = document.getElementById("usageHours");
  const studyHoursInput = document.getElementById("studyHours");
  const activityHoursInput = document.getElementById("activityHours");
  const sleepHoursInput = document.getElementById("sleepHours");
  const revealBtn = document.getElementById("revealBtn");
  const formStatus = document.getElementById("formStatus");

  const selections = { gender: null, stress_level: null };

  /* --- chip groups (gender / stress level) --- */
  function initChipGroups() {
    document.querySelectorAll(".chip-group").forEach((group) => {
      const name = group.getAttribute("data-name");
      group.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          group.querySelectorAll(".chip").forEach((c) => {
            c.classList.remove("chip--selected");
            c.setAttribute("aria-checked", "false");
          });
          chip.classList.add("chip--selected");
          chip.setAttribute("aria-checked", "true");
          selections[name] = chip.getAttribute("data-value");
          clearFieldError(name);
        });
      });
    });
  }

  /* --- "Other" country reveal --- */
  function initCountryOther() {
    if (!countrySelect) return;
    countrySelect.addEventListener("change", () => {
      const isOther = countrySelect.value === "__other__";
      countryOtherInput.classList.toggle("is-hidden", !isOther);
      if (!isOther) countryOtherInput.value = "";
    });
  }

  /* --- range sliders: live value label + fill --- */
  function initSlider(input, labelId) {
    if (!input) return;
    const label = document.getElementById(labelId);

    function sync() {
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const val = parseFloat(input.value);
      const pct = ((val - min) / (max - min)) * 100;
      input.style.setProperty("--range-progress", pct + "%");
      if (label) {
        label.textContent = Number.isInteger(val) ? val : val.toFixed(1);
      }
    }

    input.addEventListener("input", sync);
    sync();
  }

  function initSliders() {
    initSlider(usageHoursInput, "usageHoursVal");
    initSlider(studyHoursInput, "studyHoursVal");
    initSlider(activityHoursInput, "activityHoursVal");
    initSlider(sleepHoursInput, "sleepHoursVal");
  }

  /* ---------------------------------------------------------
     6. VALIDATION
     --------------------------------------------------------- */
  function setFieldError(name, message) {
    const el = document.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = message || "";
  }
  function clearFieldError(name) {
    setFieldError(name, "");
  }

  function markInvalid(el, invalid) {
    if (!el) return;
    el.classList.toggle("is-invalid", !!invalid);
  }

  function validateForm() {
    let firstInvalid = null;
    let isValid = true;

    function fail(el, name, message) {
      isValid = false;
      setFieldError(name, message);
      markInvalid(el, true);
      if (!firstInvalid) firstInvalid = el;
    }

    // age
    const age = Number(ageInput.value);
    if (!ageInput.value || Number.isNaN(age) || age < 10 || age > 100) {
      fail(ageInput, "age", "Please enter an age between 10 and 100.");
    } else {
      markInvalid(ageInput, false);
      clearFieldError("age");
    }

    // gender
    if (!selections.gender) {
      fail(null, "gender", "Please select an option.");
    } else {
      clearFieldError("gender");
    }

    // country
    if (!countrySelect.value) {
      fail(countrySelect, "country", "Please select your country.");
    } else if (
      countrySelect.value === "__other__" &&
      !countryOtherInput.value.trim()
    ) {
      fail(countryOtherInput, "country", "Please tell us your country.");
    } else {
      markInvalid(countrySelect, false);
      markInvalid(countryOtherInput, false);
      clearFieldError("country");
    }

    // academic level
    if (!academicLevelSelect.value) {
      fail(academicLevelSelect, "academic_level", "Please select your academic level.");
    } else {
      markInvalid(academicLevelSelect, false);
      clearFieldError("academic_level");
    }

    // platform
    if (!platformSelect.value) {
      fail(platformSelect, "most_used_platform", "Please select a platform.");
    } else {
      markInvalid(platformSelect, false);
      clearFieldError("most_used_platform");
    }

    // purpose
    if (!purposeSelect.value) {
      fail(purposeSelect, "purpose_of_use", "Please select a purpose.");
    } else {
      markInvalid(purposeSelect, false);
      clearFieldError("purpose_of_use");
    }

    // daily unlocks
    const unlocks = Number(dailyUnlocksInput.value);
    if (!dailyUnlocksInput.value || Number.isNaN(unlocks) || unlocks < 0) {
      fail(dailyUnlocksInput, "daily_unlocks", "Please enter a number of 0 or more.");
    } else {
      markInvalid(dailyUnlocksInput, false);
      clearFieldError("daily_unlocks");
    }

    // stress level
    if (!selections.stress_level) {
      fail(null, "stress_level", "Please select your current stress level.");
    } else {
      clearFieldError("stress_level");
    }

    if (firstInvalid && typeof firstInvalid.focus === "function") {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid.focus({ preventScroll: true });
    }

    return isValid;
  }

  /* ---------------------------------------------------------
     7. PAYLOAD — matches the FastAPI StudentData model exactly
     --------------------------------------------------------- */
  function buildPayload() {
    const country =
      countrySelect.value === "__other__"
        ? countryOtherInput.value.trim()
        : countrySelect.value;

    return {
      age: Number(ageInput.value),
      gender: selections.gender,
      country: country,
      academic_level: academicLevelSelect.value,
      most_used_platform: platformSelect.value,
      purpose_of_use: purposeSelect.value,
      avg_daily_usage_hours: Number(usageHoursInput.value),
      daily_unlocks: Number(dailyUnlocksInput.value),
      study_hours: Number(studyHoursInput.value),
      physical_activity_hours: Number(activityHoursInput.value),
      sleep_hours_per_night: Number(sleepHoursInput.value),
      stress_level: selections.stress_level,
    };
  }

  /* ---------------------------------------------------------
     8. API CALL
     --------------------------------------------------------- */
  async function requestPrediction(payload) {
    let response;
    try {
      response = await fetch(`${API_URL}${PREDICT_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new Error(
        "🌿 We couldn't reach the mountain trail right now. Please make sure the prediction server is running and try again."
      );
    }

    if (!response.ok) {
      if (response.status === 422) {
        throw new Error(
          "🌿 A few answers don't look quite right. Please review your entries and try again."
        );
      }
      throw new Error(
        "🌿 The trail is a little foggy right now — the server had trouble with that request. Please try again shortly."
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error(
        "🌿 We reached the server, but the response didn't look right. Please try again."
      );
    }

    if (
      !data ||
      typeof data.predicted_mental_health_score !== "number" ||
      Number.isNaN(data.predicted_mental_health_score)
    ) {
      throw new Error(
        "🌿 We reached the server, but couldn't find a score in the response. Please try again."
      );
    }

    return data.predicted_mental_health_score;
  }

  /* ---------------------------------------------------------
     9. RESULT REVEAL — gauge + scene
     --------------------------------------------------------- */
  const resultSection = document.getElementById("result");
  const resultBg = document.getElementById("resultBg");
  const resultNote = document.getElementById("resultNote");
  const gaugeCircle = document.getElementById("gaugeValueCircle");
  const scoreNumberEl = document.getElementById("scoreNumber");

  const GAUGE_RADIUS = 95;
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function showResult(score) {
    const ratio = Math.min(Math.max(score / SCORE_MAX, 0), 1);

    // pick a peaceful scene purely from the score's position in range —
    // all three are calm, supportive imagery; none implies a diagnosis.
    resultBg.classList.remove("scene-forest", "scene-valley", "scene-cloudy");
    let note;
    if (ratio < 1 / 3) {
      resultBg.classList.add("scene-forest");
      note = "A quiet grove for reflection — here's your result, gently held.";
    } else if (ratio < 2 / 3) {
      resultBg.classList.add("scene-valley");
      note = "A wide valley view — here's your result, right where you are today.";
    } else {
      resultBg.classList.add("scene-cloudy");
      note = "Calm skies over the peaks — here's your result.";
    }
    resultNote.textContent = note;

    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // gauge geometry
    gaugeCircle.style.strokeDasharray = String(GAUGE_CIRCUMFERENCE);
    gaugeCircle.style.strokeDashoffset = String(GAUGE_CIRCUMFERENCE);

    if (prefersReducedMotion) {
      gaugeCircle.style.strokeDashoffset = String(
        GAUGE_CIRCUMFERENCE * (1 - ratio)
      );
      scoreNumberEl.textContent = formatScore(score);
      return;
    }

    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      gaugeCircle.style.strokeDashoffset = String(
        GAUGE_CIRCUMFERENCE * (1 - ratio * eased)
      );
      scoreNumberEl.textContent = formatScore(score * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        scoreNumberEl.textContent = formatScore(score);
      }
    }
    requestAnimationFrame(tick);
  }

  function formatScore(value) {
    return value.toFixed(1);
  }

  /* ---------------------------------------------------------
     10. SUBMIT HANDLER
     --------------------------------------------------------- */
  function initFormSubmit() {
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      formStatus.textContent = "";
      formStatus.classList.remove("is-success");

      if (!validateForm()) {
        formStatus.textContent = "Please fill in the highlighted fields above.";
        return;
      }

      const payload = buildPayload();

      revealBtn.classList.add("is-loading");
      revealBtn.disabled = true;

      try {
        const score = await requestPrediction(payload);
        showResult(score);
      } catch (err) {
        formStatus.textContent = err.message;
      } finally {
        revealBtn.classList.remove("is-loading");
        revealBtn.disabled = false;
      }
    });
  }

  function initRestartButton() {
    const restartBtn = document.getElementById("restartBtn");
    if (!restartBtn) return;
    restartBtn.addEventListener("click", () => {
      resultSection.hidden = true;
      document
        .getElementById("assessment")
        .scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------------------------------------------------------
     INIT
     --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initLeaves();
    initFadeIns();
    initParallax();
    initScrollButtons();
    initChipGroups();
    initCountryOther();
    initSliders();
    initFormSubmit();
    initRestartButton();
  });
})();
