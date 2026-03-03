/* Audience switcher */
function setAudience(type) {
  if (!document.body) return;

  const isCoach = type === "coach";
  document.body.classList.toggle("coach-mode", isCoach);

  const heroInd = document.getElementById("hero-individual");
  const heroCoach = document.getElementById("hero-coach");
  heroInd?.classList.toggle("visible", !isCoach);
  heroCoach?.classList.toggle("visible", isCoach);

  const pricingIndividual = document.getElementById("pricing-individual");
  const pricingCoach = document.getElementById("pricing-coach");

  if (pricingIndividual) {
    pricingIndividual.style.display = isCoach ? "none" : "block";
    pricingIndividual.classList.toggle("active", !isCoach);
  }

  if (pricingCoach) {
    pricingCoach.style.display = isCoach ? "block" : "none";
  }

  document.title = isCoach
    ? "CAPABLE - Coaching Platform for Serious Trainers"
    : "CAPABLE - Track Your Health & Fitness Progress";

  setPricingTab(isCoach ? "pro" : "free");
}

/* Pricing tab */
function setPricingTab(tab) {
  document.getElementById("pt-free")?.classList.toggle("active", tab === "free");
  document.getElementById("pt-pro")?.classList.toggle("active", tab === "pro");
}

function bindPricingEvents() {
  document.getElementById("pt-free")?.addEventListener("click", () => {
    setAudience("individual");
  });

  document.getElementById("pt-pro")?.addEventListener("click", () => {
    setAudience("coach");
  });

  document.getElementById("coach-pricing-btn")?.addEventListener("click", () => {
    setAudience("coach");
  });

  document.getElementById("athlete-pricing-btn")?.addEventListener("click", () => {
    setAudience("individual");
  });
}

function bindStickyNav() {
  const navEl = document.getElementById("nav");
  if (!navEl) return;

  window.addEventListener(
    "scroll",
    () => {
      navEl.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true }
  );
}

function bindSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function bindHeroPromptTyping() {
  const individualEl = document.getElementById("hero-individual-prompt-text");
  const coachEl = document.getElementById("hero-coach-prompt-text");
  if (!individualEl || !coachEl) return;

  const typeSpeedMs = 34;
  const deleteSpeedMs = 18;
  const holdMs = 1500;

  const tracks = [
    {
      el: individualEl,
      prompts: [
        "Build me a weekly plan using my sleep, workouts, and nutrition trends.",
        "Show me what habits are helping me recover faster this month.",
        "Summarize my week and tell me where to focus next.",
      ],
      phaseOffsetMs: 0,
    },
    {
      el: coachEl,
      prompts: [
        "Summarize this week for all clients and flag who needs intervention.",
        "Identify clients trending off-plan and draft outreach messages.",
        "Generate weekly progress updates I can send to every client.",
      ],
      phaseOffsetMs: 800,
    },
  ];

  tracks.forEach((track) => {
    track.el.textContent = "";
    let promptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer;

    const tick = () => {
      const full = track.prompts[promptIndex];

      if (!isDeleting) {
        charIndex = Math.min(charIndex + 1, full.length);
        track.el.textContent = full.slice(0, charIndex);

        if (charIndex >= full.length) {
          isDeleting = true;
          timer = setTimeout(tick, holdMs);
          return;
        }

        timer = setTimeout(tick, typeSpeedMs);
        return;
      }

      charIndex = Math.max(charIndex - 1, 0);
      track.el.textContent = full.slice(0, charIndex);

      if (charIndex <= 0) {
        isDeleting = false;
        promptIndex = (promptIndex + 1) % track.prompts.length;
        timer = setTimeout(tick, 280);
        return;
      }

      timer = setTimeout(tick, deleteSpeedMs);
    };

    setTimeout(tick, track.phaseOffsetMs);

    window.addEventListener("beforeunload", () => clearTimeout(timer), { once: true });
  });
}

function initMarketingPage() {
  bindStickyNav();
  bindSmoothScroll();
  bindPricingEvents();
  bindHeroPromptTyping();
  setAudience("individual");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMarketingPage);
} else {
  initMarketingPage();
}
