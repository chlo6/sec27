const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const dialog = document.querySelector(".site-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogCopy = document.querySelector("#dialog-copy");
const dialogMessage = document.querySelector(".dialog-message");
const toast = document.querySelector(".toast");

const dialogContent = {
  signin: ["Welcome back.", "Sign-in will connect to the role-based account system in the next build phase."],
  join: ["Ready to make an impact?", "Choose the role that best fits you. Account creation will be connected in the next build phase."],
  organizer: ["Turn plans into a fully staffed shift.", "Organizer tools will include event creation, approvals, attendance, and hour verification."],
  admin: ["Keep the community trusted.", "Admin tools will support organization approval, activity review, permissions, and issue resolution."],
  coverage: ["Fill the last open spots.", "Matching will suggest qualified, available volunteers without creating schedule conflicts."],
};

const roleData = {
  student: { hours: "42.5", metric: "verified hours", ring: "71%", time: "9:00", period: "AM", kicker: "NEXT SHIFT", title: "Community Garden Crew", detail: "Riverside Garden · 3 hours", progress: "71%" },
  organizer: { hours: "34", metric: "registered volunteers", ring: "83%", time: "8:00", period: "AM", kicker: "STAFFING NEXT", title: "Fall Garden Day", detail: "4 open spots · 3 shifts", progress: "83%" },
  admin: { hours: "12", metric: "active organizations", ring: "92%", time: "2", period: "NEW", kicker: "REVIEW QUEUE", title: "Organizer Approvals", detail: "2 profiles ready for review", progress: "92%" },
};

function setMenu(open) {
  menuToggle.setAttribute("aria-expanded", String(open));
  navLinks.classList.toggle("is-open", open);
}

menuToggle.addEventListener("click", () => setMenu(menuToggle.getAttribute("aria-expanded") !== "true"));
navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
window.addEventListener("scroll", () => header.classList.toggle("is-scrolled", window.scrollY > 20), { passive: true });

document.querySelectorAll("[data-role]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const data = roleData[tab.dataset.role];
    document.querySelectorAll("[data-role]").forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
    document.querySelector("[data-role-hours]").textContent = data.hours;
    document.querySelector("[data-role-metric]").textContent = data.metric;
    document.querySelector("[data-role-ring]").textContent = data.ring;
    document.querySelector(".ring").style.background = `conic-gradient(var(--blue) ${data.progress}, #e5e8f0 0)`;
    document.querySelector("[data-role-time]").textContent = data.time;
    document.querySelector("[data-role-period]").textContent = data.period;
    document.querySelector("[data-role-kicker]").textContent = data.kicker;
    document.querySelector("[data-role-title]").textContent = data.title;
    document.querySelector("[data-role-detail]").textContent = data.detail;
  });
});

const searchInput = document.querySelector("#opportunity-search");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const cards = [...document.querySelectorAll(".opportunity-card")];
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector(".empty-state");
let activeFilter = "all";

function updateResults() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach((card) => {
    const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
    const queryMatch = !query || card.dataset.search.includes(query) || card.textContent.toLowerCase().includes(query);
    const matches = categoryMatch && queryMatch;
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  resultCount.textContent = visible;
  emptyState.hidden = visible !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updateResults();
  });
});
searchInput.addEventListener("input", updateResults);

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

document.querySelectorAll(".save-button").forEach((button) => {
  button.addEventListener("click", () => {
    const saved = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(saved));
    button.querySelector("span").textContent = saved ? "♥" : "♡";
    const name = button.getAttribute("aria-label").replace("Save ", "");
    showToast(saved ? `${name} saved to your list.` : `${name} removed from your saved list.`);
  });
});

document.querySelectorAll("[data-open-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.openDialog;
    const content = dialogContent[key] || dialogContent.join;
    dialogTitle.textContent = content[0];
    dialogCopy.textContent = content[1];
    dialogMessage.textContent = "";
    dialog.showModal();
  });
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelectorAll("[data-demo-role]").forEach((button) => {
  button.addEventListener("click", () => {
    dialogMessage.textContent = `${button.dataset.demoRole} selected. This demo is ready for account setup next.`;
  });
});
