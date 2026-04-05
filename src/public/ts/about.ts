// ================================================================
// YUVAVERSE — ABOUT.TS
// Scroll-reveal via IntersectionObserver
// ================================================================

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // Attach .reveal to all key sections
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // fire once
          }
        });
      },
      { threshold: 0.12 },
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    // Staggered delay for grid children
    document.querySelectorAll('.team-grid .team-card, .pillars-grid .pillar-card').forEach((card, i) => {
      (card as HTMLElement).style.transitionDelay = `${i * 60}ms`;
      card.classList.add('reveal');
      observer.observe(card);
    });
  });
})();
