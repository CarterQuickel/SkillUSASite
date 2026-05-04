document.addEventListener("DOMContentLoaded", () => {
  const cards = Array.from(document.querySelectorAll(".sponsor-card"));
  cards.forEach((card, index) => {
    card.style.animationDelay = `${index * 80}ms`;
  });
});
