window.addEventListener("error", (event) => {
  console.error(`CivicShift boot error at ${event.filename}:${event.lineno}:${event.colno} - ${event.message}`);
  window.setTimeout(() => {
    const app = document.querySelector("#app");
    if (app && !app.querySelector(".app-shell") && !app.querySelector(".account-wrap")) {
      app.innerHTML = `
        <main class="workspace" style="max-width:760px;margin:80px auto">
          <section class="card">
            <span class="eyebrow">Portal recovery</span>
            <h1>CivicShift could not finish loading.</h1>
            <p>Please refresh the page. Your browser-local demo data has not been removed.</p>
            <button class="button button-primary" type="button" onclick="location.reload()">Refresh portal</button>
          </section>
        </main>`;
    }
  }, 150);
});
