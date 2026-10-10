const sampleInput = document.querySelector("#sample-text");
const samples = [...document.querySelectorAll("[data-sample]")];
const favorites = new Set();
const decisionTitle = document.querySelector("#decision-title");
const decisionCopy = document.querySelector("#decision-copy");

function updateSamples() {
  const value = sampleInput.value.trim() || "The quick brown fox jumps over the lazy dog.";
  samples.forEach((sample) => { sample.textContent = value; });
}

function updateShortlist() {
  if (favorites.size === 0) {
    decisionTitle.textContent = "Pick any styles you like.";
    decisionCopy.textContent = "Your favorites will appear here so they are easy to compare.";
    return;
  }

  const names = [...favorites];
  decisionTitle.textContent = names.join(names.length > 1 ? " + " : "");
  decisionCopy.textContent = names.length === 1
    ? "Great choice. We can apply this direction to the CivicShift homepage next."
    : "Nice shortlist. Compare these again, then we can apply the winner to the homepage.";
}

sampleInput.addEventListener("input", updateSamples);
document.querySelector("#reset-sample").addEventListener("click", () => {
  sampleInput.value = "The quick brown fox jumps over the lazy dog.";
  updateSamples();
  sampleInput.focus();
});

document.querySelectorAll(".favorite").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest("[data-font-card]");
    const name = card.dataset.fontName;
    const selected = !favorites.has(name);

    if (selected) favorites.add(name);
    else favorites.delete(name);

    card.classList.toggle("is-favorite", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.innerHTML = selected ? "<span>♥</span> Added to shortlist" : "<span>♡</span> Favorite this look";
    updateShortlist();
  });
});
