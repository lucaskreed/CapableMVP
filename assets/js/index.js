/* Sticky nav */
const navEl = document.getElementById("nav");
if (navEl) {
  window.addEventListener(
    "scroll",
    () => {
      navEl.classList.toggle("scrolled", window.scrollY > 40);
    },
    { passive: true }
  );
}

/* Smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

/* Audience switcher */
function setAudience(type) {
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
}

/* Pricing tab */
function setPricingTab(tab) {
  document.getElementById("pt-free")?.classList.toggle("active", tab === "free");
  document.getElementById("pt-pro")?.classList.toggle("active", tab === "pro");
}

function bindPricingEvents() {
  document.getElementById("pt-free")?.addEventListener("click", () => {
    setPricingTab("free");
  });

  document.getElementById("pt-pro")?.addEventListener("click", () => {
    setPricingTab("pro");
    setAudience("coach");
  });

  document.getElementById("coach-pricing-btn")?.addEventListener("click", () => {
    setAudience("coach");
  });
}

bindPricingEvents();
setAudience("individual");
