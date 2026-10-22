import { CATEGORIES, STATUSES, CURIOSITY_LEVELS, PRIORITIES, makeIdea, sampleIdeas, dataStore, SUGGESTIONS } from "./data.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { ideas: [], activeView: "dashboard", activeId: null, mode: "detail", suggestion: null, favoriteOnly: false, ready: false, saving: false };
const dialog = $("#idea-dialog");
const surpriseDialog = $("#surprise-dialog");
const dialogContent = $("#dialog-content");
const categoryIcons = {
  "Data & Analytics": "📊", "Coding": "⌨️", "AI & Technology": "🛰️",
  "Food & Geography": "🌍", "Electronics & DIY": "🔌",
  "Career & Learning": "🎓", "Other": "✨"
};
const categoryColors = {
  "Data & Analytics": "#74d2c6", "Coding": "#f2a58e", "AI & Technology": "#b8b5f4",
  "Food & Geography": "#f4ce73", "Electronics & DIY": "#a7d6a1",
  "Career & Learning": "#e9a9c8", "Other": "#aeb9ce"
};
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const safeURL = (value = "") => {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
};
const dateLabel = value => value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Not dated";
const statusClass = status => "status-" + String(status || "Idea").toLowerCase();
const taskCount = idea => (idea.tasks || []).filter(task => task.done).length;
const activeCount = () => state.ideas.filter(idea => ["Exploring", "Building"].includes(idea.status)).length;
const totalHours = () => state.ideas.reduce((sum, idea) => sum + (Number(idea.hours) || 0), 0);
const findIdea = id => state.ideas.find(idea => idea.id === id);

function showNotice(message) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => { notice.hidden = true; }, 3200);
}

async function persist(message = "Changes saved in this browser") {
  state.saving = true;
  $("#save-status").textContent = "Saving…";
  try {
    await dataStore.save(state.ideas);
    $("#save-status").textContent = message;
  } catch (error) {
    $("#save-status").textContent = "Save issue";
    showNotice(error.message || "Could not save your changes.");
  } finally {
    state.saving = false;
  }
}

function categoryOptions(selected = "Other") {
  return CATEGORIES.map(category => `<option value="${escapeHTML(category)}" ${category === selected ? "selected" : ""}>${categoryIcons[category]} ${escapeHTML(category)}</option>`).join("");
}
function statusOptions(selected = "Idea") {
  return STATUSES.map(status => `<option value="${status}" ${status === selected ? "selected" : ""}>${status}</option>`).join("");
}
function categoryChip(category) {
  return `<span class="category-chip"><span class="cat-icon" aria-hidden="true">${categoryIcons[category] || "✨"}</span> ${escapeHTML(category)}</span>`;
}
function statusPill(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHTML(status)}</span>`;
}
function progressBar(value) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="progress-track" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><div class="progress-fill" style="width:${progress}%"></div></div>`;
}

function cardHTML(idea, index) {
  const done = taskCount(idea);
  const taskLabel = idea.tasks.length ? `${done}/${idea.tasks.length} tasks` : escapeHTML(idea.curiosity || "Just Curious");
  return `<article class="idea-card" style="--category-color:${categoryColors[idea.category] || "#74d2c6"};animation-delay:${Math.min(index, 8) * 45}ms">
    <div class="idea-card-top">${categoryChip(idea.category)}<div style="display:flex;align-items:center;gap:5px">${idea.favorite ? '<span class="favorite-mark" aria-label="Favorite">★</span>' : ""}${statusPill(idea.status)}</div></div>
    <h3><button class="card-title-button" data-action="open-idea" data-id="${escapeHTML(idea.id)}">${escapeHTML(idea.title)}</button></h3>
    <p class="description">${escapeHTML(idea.description || "No description yet. Every rabbit hole starts somewhere.")}</p>
    <div class="card-meta"><span>${Math.round(idea.progress || 0)}% charted</span><span>${taskLabel}</span></div>
    ${progressBar(idea.progress)}
    <div class="card-bottom"><span>Updated ${escapeHTML(dateLabel(idea.updatedAt))}</span><button data-action="favorite" data-id="${escapeHTML(idea.id)}" aria-label="${idea.favorite ? "Remove favorite" : "Add favorite"}" aria-pressed="${Boolean(idea.favorite)}">${idea.favorite ? "★ Saved" : "☆ Favorite"}</button><button data-action="open-idea" data-id="${escapeHTML(idea.id)}">Open ↗</button></div>
    <button class="card-open-overlay" data-action="open-idea" data-id="${escapeHTML(idea.id)}" aria-label="Open ${escapeHTML(idea.title)}"></button>
  </article>`;
}

function emptyHTML(title, body, actionLabel = "Add a rabbit hole", action = "new") {
  return `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">🧭</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(body)}</p><button class="button button-coral" data-action="${action}">${escapeHTML(actionLabel)}</button></div>`;
}

function renderDashboard() {
  $("#entry-count").textContent = String(state.ideas.length).padStart(2, "0");
  $("#stat-active").textContent = activeCount();
  $("#stat-ideas").textContent = state.ideas.length;
  $("#stat-completed").textContent = state.ideas.filter(idea => idea.status === "Completed").length;
  $("#stat-hours").textContent = totalHours();
  const current = [...state.ideas].filter(idea => idea.status !== "Completed").sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  $("#current-grid").innerHTML = current.length ? current.map(cardHTML).join("") : emptyHTML("Your radar is quiet", "No open explorations yet. Add a rabbit hole or let us surprise you.");
}
function renderExplore() {
  const term = $("#search-input").value.trim().toLowerCase();
  const category = $("#category-filter").value;
  const status = $("#status-filter").value;
  const sort = $("#sort-filter").value;
  const list = state.ideas.filter(idea => category === "All" || idea.category === category)
    .filter(idea => status === "All" || idea.status === status)
    .filter(idea => !state.favoriteOnly || idea.favorite)
    .filter(idea => !term || [idea.title, idea.description, idea.notes, ...idea.tasks.map(t => t.text)].some(value => String(value || "").toLowerCase().includes(term)))
    .sort((a, b) => sort === "newest" ? b.createdAt - a.createdAt : sort === "title" ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt);
  $("#results-count").textContent = `Showing ${list.length} of ${state.ideas.length} explorations${state.favoriteOnly ? " · favorites only" : ""}`;
  $("#favorite-filter").setAttribute("aria-pressed", String(state.favoriteOnly));
  $("#favorite-filter").textContent = state.favoriteOnly ? "★ Favorites only" : "☆ Favorites";
  $("#all-grid").innerHTML = list.length ? list.map(cardHTML).join("") : state.ideas.length ? emptyHTML("Nothing on this trail", "No explorations match those filters.", "Clear filters", "reset-filters") : emptyHTML("The map is blank", "Every great expedition starts with one question.");
}
function render() {
  renderDashboard();
  renderExplore();
  $$("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === state.activeView));
  $("#dashboard-view").hidden = state.activeView !== "dashboard";
  $("#explore-view").hidden = state.activeView !== "explore";
}

function setView(view) {
  state.activeView = view;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openNewIdea(prefill = {}) {
  state.mode = "new";
  state.activeId = null;
  dialogContent.innerHTML = ideaFormHTML(prefill);
  dialog.showModal();
}
function ideaFormHTML(idea = {}, editing = false) {
  const title = editing ? "Edit your entry" : "Catch a new idea";
  return `<div class="dialog-header"><div><p class="eyebrow">${editing ? "UPDATE YOUR FIELD NOTES" : "NEW JOURNAL ENTRY"}</p><h2 id="dialog-title">${title}</h2><p>${editing ? "Change the plan. Rabbit holes are allowed to evolve." : "Get it out of your head and into your radar."}</p></div><button class="dialog-close" data-action="close-dialog" aria-label="Close">×</button></div>
  <form id="idea-form" class="form-body" novalidate>
    <div class="form-field" style="margin-top:20px"><label for="idea-title">Title *</label><input id="idea-title" name="title" maxlength="120" required placeholder="The thing I can't stop thinking about…" value="${escapeHTML(idea.title || "")}"><span class="form-help">A few words is plenty. You can figure out the rest later.</span></div>
    <div class="form-field"><label for="idea-description">What do you want to figure out?</label><textarea id="idea-description" name="description" rows="3" maxlength="1000" placeholder="A question, an idea, a thing to try…">${escapeHTML(idea.description || "")}</textarea></div>
    <div class="form-grid">
      <div class="form-field"><label for="idea-category">Category</label><select id="idea-category" name="category">${categoryOptions(idea.category || "Other")}</select></div>
      <div class="form-field"><label for="idea-curiosity">Curiosity level</label><select id="idea-curiosity" name="curiosity">${CURIOSITY_LEVELS.map(value => `<option ${(idea.curiosity || "Just Curious") === value ? "selected" : ""}>${escapeHTML(value)}</option>`).join("")}</select></div>
      <div class="form-field"><label for="idea-priority">Priority</label><select id="idea-priority" name="priority">${PRIORITIES.map(value => `<option ${(idea.priority || "Medium") === value ? "selected" : ""}>${value}</option>`).join("")}</select></div>
      <div class="form-field"><label for="idea-status">Status</label><select id="idea-status" name="status">${statusOptions(idea.status || "Idea")}</select></div>
    </div>
    <div class="form-field"><label for="idea-notes">Starting notes (optional)</label><textarea id="idea-notes" name="notes" rows="3" placeholder="Links to chase, thoughts, questions…">${escapeHTML(idea.notes || "")}</textarea></div>
    <div class="dialog-actions"><button class="button button-coral" type="submit">${editing ? "Save changes" : "Add to my radar"} ↗</button><button class="button button-outline" type="button" data-action="close-dialog">Never mind</button></div>
  </form>`;
}

function openIdea(id) {
  const idea = findIdea(id);
  if (!idea) return showNotice("That exploration couldn't be found.");
  state.mode = "detail";
  state.activeId = id;
  renderDetail();
  dialog.showModal();
}
function renderDetail() {
  const idea = findIdea(state.activeId);
  if (!idea) { dialog.close(); return; }
  const tasks = idea.tasks || [];
  const links = idea.links || [];
  dialogContent.innerHTML = `<div class="dialog-header"><div><div class="dialog-badges">${categoryChip(idea.category)} ${statusPill(idea.status)} <span class="form-help">${escapeHTML(idea.priority)} priority</span></div><h2 id="dialog-title">${escapeHTML(idea.title)}</h2><p>${escapeHTML(idea.description || "No description yet. Add one when the shape of the idea becomes clearer.")}</p><div class="workspace-top-actions"><button class="mini-button ${idea.favorite ? "selected" : ""}" data-action="favorite" data-id="${escapeHTML(idea.id)}">${idea.favorite ? "★ Favorited" : "☆ Add favorite"}</button><button class="mini-button" data-action="edit-idea" data-id="${escapeHTML(idea.id)}">✎ Edit details</button></div></div><button class="dialog-close" data-action="close-dialog" aria-label="Close">×</button></div>
  <div class="dialog-columns">
    <div class="dialog-stack">
      <section class="work-panel"><h3>Status & progress</h3><div class="status-choices" role="group" aria-label="Set status">${STATUSES.map(status => `<button class="status-choice" data-action="set-status" data-status="${status}" aria-pressed="${idea.status === status}">${status}</button>`).join("")}</div>
        <div class="range-row"><input id="progress-range" type="range" min="0" max="100" step="5" value="${idea.progress}" aria-label="Progress percentage"><output class="range-value" id="progress-output">${idea.progress}%</output></div>${progressBar(idea.progress)}
        <div class="hour-control"><span>Learning hours</span><button data-action="hour-down" aria-label="Subtract one hour">−</button><output>${idea.hours || 0}</output><button data-action="hour-up" aria-label="Add one hour">+</button></div>
      </section>
      <section class="work-panel"><h3>Notes & discoveries</h3><textarea id="idea-notes-live" rows="7" placeholder="What did you find out? What should you try next?">${escapeHTML(idea.notes || "")}</textarea><div class="note-status" id="note-status">Autosaves as you type</div></section>
    </div>
    <div class="dialog-stack">
      <section class="work-panel"><h3>Experiments <span class="form-help">${taskCount(idea)}/${tasks.length}</span></h3><p class="panel-hint">Tiny steps still count.</p>
        ${tasks.length ? `<ul class="task-list">${tasks.map(task => `<li class="task-item ${task.done ? "done" : ""}"><input type="checkbox" data-action="toggle-task" data-id="${escapeHTML(task.id)}" ${task.done ? "checked" : ""} aria-label="Mark ${escapeHTML(task.text)} complete"><span>${escapeHTML(task.text)}</span><button class="remove-button" data-action="remove-task" data-id="${escapeHTML(task.id)}" aria-label="Remove task">×</button></li>`).join("")}</ul>` : '<p class="panel-hint">No tasks yet. What is the smallest next step?</p>'}
        <form class="inline-add" id="task-form"><input name="task" maxlength="160" placeholder="Add a task…" aria-label="New task"><button class="button button-coral" type="submit" aria-label="Add task">＋</button></form>
      </section>
      <section class="work-panel"><h3>Useful links</h3><p class="panel-hint">Docs, datasets, tutorials, rabbit trails.</p>
        ${links.length ? `<ul class="link-list">${links.map(item => `<li class="link-item"><a href="${escapeHTML(safeURL(item.url) || "#")}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.label || item.url)} ↗</a><button class="remove-button" data-action="remove-link" data-id="${escapeHTML(item.id)}" aria-label="Remove link">×</button></li>`).join("")}</ul>` : '<p class="panel-hint">Nothing bookmarked yet.</p>'}
        <form class="inline-add" id="link-form"><input name="label" maxlength="80" placeholder="Label" aria-label="Link label"><input name="url" type="url" placeholder="https://…" aria-label="Link URL" required><button class="button button-coral" type="submit" aria-label="Add link">＋</button></form><p id="link-error" class="form-help" role="status"></p>
      </section>
    </div>
  </div>
  <div class="delete-row"><p>Started ${escapeHTML(dateLabel(idea.createdAt))} · Last updated ${escapeHTML(dateLabel(idea.updatedAt))}</p><button class="button button-outline text-danger" data-action="delete-idea" data-id="${escapeHTML(idea.id)}">Delete this rabbit hole</button></div>`;
}
function updateIdea(id, patch, rerender = true) {
  const idea = findIdea(id);
  if (!idea) return;
  Object.assign(idea, patch, { updatedAt: Date.now() });
  persist();
  render();
  if (rerender && dialog.open && state.mode === "detail") renderDetail();
}

function showSuggestion() {
  let next = Math.floor(Math.random() * SUGGESTIONS.length);
  if (SUGGESTIONS.length > 1 && next === state.suggestion) next = (next + 1) % SUGGESTIONS.length;
  state.suggestion = next;
  const suggestion = SUGGESTIONS[next];
  $("#surprise-content").innerHTML = `<article class="suggestion-card">${categoryChip(suggestion.category)}<h3>${escapeHTML(suggestion.title)}</h3><p>${escapeHTML(suggestion.description)}</p></article>`;
  surpriseDialog.showModal();
}
function saveSuggestion() {
  const suggestion = SUGGESTIONS[state.suggestion];
  if (!suggestion) return;
  const idea = makeIdea({ ...suggestion, curiosity: "I Want to Try This" });
  state.ideas.unshift(idea);
  persist();
  render();
  surpriseDialog.close();
  openIdea(idea.id);
  showNotice("New rabbit hole saved to your radar.");
}

function handleAction(button) {
  const { action, id } = button.dataset;
  if (action === "new") openNewIdea();
  else if (action === "open-idea") openIdea(id);
  else if (action === "edit-idea") {
    const idea = findIdea(id);
    if (!idea) return;
    state.mode = "edit";
    state.activeId = id;
    dialogContent.innerHTML = ideaFormHTML(idea, true);
  }
  else if (action === "close-dialog") { if (dialog.open) dialog.close(); if (surpriseDialog.open) surpriseDialog.close(); }
  else if (action === "favorite") {
    const idea = findIdea(id);
    if (!idea) return;
    updateIdea(id, { favorite: !idea.favorite }, false);
    if (dialog.open && state.mode === "detail" && state.activeId === id) renderDetail();
  }
  else if (action === "surprise") showSuggestion();
  else if (action === "another-suggestion") showSuggestion();
  else if (action === "save-suggestion") saveSuggestion();
  else if (action === "set-status") {
    const idea = findIdea(state.activeId);
    if (!idea) return;
    const status = button.dataset.status;
    updateIdea(idea.id, { status, progress: status === "Completed" ? 100 : idea.progress });
  }
  else if (action === "hour-up" || action === "hour-down") {
    const idea = findIdea(state.activeId);
    if (!idea) return;
    updateIdea(idea.id, { hours: Math.max(0, (Number(idea.hours) || 0) + (action === "hour-up" ? 1 : -1)) });
  }
  else if (action === "toggle-task") {
    const idea = findIdea(state.activeId);
    if (!idea) return;
    const tasks = idea.tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
    const total = tasks.length ? Math.round(tasks.filter(task => task.done).length / tasks.length * 100) : idea.progress;
    updateIdea(idea.id, { tasks, progress: total });
  }
  else if (action === "remove-task") {
    const idea = findIdea(state.activeId);
    if (idea) updateIdea(idea.id, { tasks: idea.tasks.filter(task => task.id !== id) });
  }
  else if (action === "remove-link") {
    const idea = findIdea(state.activeId);
    if (idea) updateIdea(idea.id, { links: idea.links.filter(item => item.id !== id) });
  }
  else if (action === "delete-idea") {
    const idea = findIdea(id);
    if (!idea) return;
    if (window.confirm(`Delete "${idea.title}"? This can't be undone.`)) {
      state.ideas = state.ideas.filter(item => item.id !== id);
      persist();
      render();
      dialog.close();
      showNotice("Rabbit hole deleted.");
    }
  }
  else if (action === "clear") {
    if (window.confirm("Clear every idea in this journal? This can't be undone.")) {
      state.ideas = [];
      persist();
      render();
      showNotice("Your journal is clear. Ready for a fresh start.");
    }
  }
  else if (action === "load-samples") {
    if (window.confirm("Replace your current journal with the sample explorations?")) {
      state.ideas = sampleIdeas();
      persist();
      render();
      showNotice("Sample explorations loaded.");
    }
  }
  else if (action === "reset-filters") {
    $("#search-input").value = "";
    $("#category-filter").value = "All";
    $("#status-filter").value = "All";
    $("#sort-filter").value = "updated";
    state.favoriteOnly = false;
    renderExplore();
  }
}

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) { setView(viewButton.dataset.view); return; }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) { handleAction(actionButton); return; }
  const overlay = event.target.closest(".card-open-overlay");
  if (overlay) handleAction(overlay);
});

document.addEventListener("submit", async event => {
  if (event.target.id === "idea-form") {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      $("#idea-title").setCustomValidity("Give this idea a title first.");
      $("#idea-title").reportValidity();
      $("#idea-title").focus();
      return;
    }
    const values = {
      title, description: String(formData.get("description") || "").trim(),
      category: String(formData.get("category") || "Other"),
      curiosity: String(formData.get("curiosity") || "Just Curious"),
      priority: String(formData.get("priority") || "Medium"),
      status: String(formData.get("status") || "Idea"),
      notes: String(formData.get("notes") || "").trim()
    };
    if (state.mode === "edit" && state.activeId) {
      const idea = findIdea(state.activeId);
      if (!idea) return;
      Object.assign(idea, values, { progress: values.status === "Completed" ? 100 : idea.progress, updatedAt: Date.now() });
      persist();
      render();
      renderDetail();
      showNotice("Changes saved.");
    } else {
      const idea = makeIdea(values);
      state.ideas.unshift(idea);
      persist();
      render();
      state.activeId = idea.id;
      state.mode = "detail";
      renderDetail();
      showNotice("Rabbit hole added to your radar.");
    }
  }
  if (event.target.id === "task-form") {
    event.preventDefault();
    const input = event.target.elements.task;
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    const idea = findIdea(state.activeId);
    if (!idea) return;
    idea.tasks.push({ id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11), text, done: false });
    idea.updatedAt = Date.now();
    await persist();
    render();
    renderDetail();
  }
  if (event.target.id === "link-form") {
    event.preventDefault();
    const form = event.target;
    const label = form.elements.label.value.trim();
    let url = form.elements.url.value.trim();
    const error = $("#link-error");
    if (!url) { error.textContent = "Add a URL first."; return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const checked = safeURL(url);
    if (!checked) { error.textContent = "That doesn't look like a valid web URL."; return; }
    const idea = findIdea(state.activeId);
    if (!idea) return;
    idea.links.push({ id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11), label: label || checked, url: checked });
    idea.updatedAt = Date.now();
    await persist();
    render();
    renderDetail();
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "search-input") renderExplore();
  if (event.target.id === "progress-range") {
    const idea = findIdea(state.activeId);
    if (!idea) return;
    const progress = Number(event.target.value);
    idea.progress = progress;
    idea.updatedAt = Date.now();
    $("#progress-output").textContent = progress + "%";
    const fill = $(".progress-fill", dialogContent);
    if (fill) fill.style.width = progress + "%";
    persist();
    render();
  }
  if (event.target.id === "idea-notes-live") {
    const idea = findIdea(state.activeId);
    if (!idea) return;
    idea.notes = event.target.value;
    idea.updatedAt = Date.now();
    $("#note-status").textContent = "Saving…";
    persist().then(() => { if ($("#note-status")) $("#note-status").textContent = "Autosaves as you type"; });
  }
  if (event.target.id === "idea-title") event.target.setCustomValidity("");
});

document.addEventListener("change", event => {
  if (["category-filter", "status-filter", "sort-filter"].includes(event.target.id)) renderExplore();
  if (event.target.id === "progress-range") {
    const idea = findIdea(state.activeId);
    if (idea) { if (idea.progress === 100) idea.status = "Completed"; persist(); render(); renderDetail(); }
  }
});

$("#favorite-filter").addEventListener("click", () => { state.favoriteOnly = !state.favoriteOnly; renderExplore(); });
dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
surpriseDialog.addEventListener("click", event => { if (event.target === surpriseDialog) surpriseDialog.close(); });
dialog.addEventListener("close", () => { state.activeId = null; });

async function init() {
  try {
    $("#current-grid").innerHTML = emptyHTML("Getting your journal ready…", "One moment while we find your saved explorations.", "Refresh", "retry");
    state.ideas = await dataStore.load();
    state.ready = true;
    CATEGORIES.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      $("#category-filter").append(option);
    });
    render();
  } catch (error) {
    $("#current-grid").innerHTML = `<div class="empty-state"><div class="empty-emoji">🛠️</div><h3>Couldn't load the journal</h3><p>${escapeHTML(error.message || "Something went wrong while loading your saved ideas.")}</p><button class="button button-coral" onclick="location.reload()">Try again</button></div>`;
    $("#save-status").textContent = "Load issue";
  }
}
init();