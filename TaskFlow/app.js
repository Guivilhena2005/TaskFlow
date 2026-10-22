(() => {
  "use strict";

  const STORAGE_KEY = "taskflow.tasks.v1";
  const PRIORITY_RANK = { high: 3, medium: 2, low: 1 };
  const PRIORITY_LABEL = { high: "Alta", medium: "Média", low: "Baixa" };
  const STATUS_LABEL = { pending: "Pendente", progress: "Em andamento", completed: "Concluída" };
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    taskList: $("#task-list"), emptyState: $("#empty-state"), dialog: $("#task-dialog"),
    form: $("#task-form"), title: $("#task-title"), description: $("#task-description"),
    priority: $("#task-priority"), status: $("#task-status"), deadline: $("#task-deadline"),
    id: $("#task-id"), error: $("#form-error"), search: $("#search-input"),
    priorityFilter: $("#priority-filter"), sort: $("#sort-select"), toast: $("#toast")
  };

  let tasks = loadTasks();
  let activeFilter = "all";
  let listView = false;
  let toastTimeout;

  function loadTasks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidStoredTask).map(task => ({
        id: task.id, title: task.title, description: task.description || "",
        priority: task.priority, status: task.status, deadline: task.deadline || "",
        createdAt: Number(task.createdAt) || Date.now(), updatedAt: Number(task.updatedAt) || Date.now()
      }));
    } catch (error) {
      console.error("Não foi possível carregar as tarefas:", error);
      window.setTimeout(() => showToast("Não foi possível ler as tarefas salvas. O armazenamento pode estar indisponível."), 0);
      return [];
    }
  }

  function isValidStoredTask(task) {
    return task && typeof task.id === "string" && typeof task.title === "string" &&
      ["high", "medium", "low"].includes(task.priority) &&
      ["pending", "progress", "completed"].includes(task.status);
  }

  function persistTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch (error) {
      console.error("Não foi possível salvar as tarefas:", error);
      showToast("Falha ao salvar. Verifique o espaço disponível ou as permissões do navegador.");
      return false;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return "Data inválida";
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date).replace(".", "");
  }

  function getDeadlineInfo(task) {
    if (!task.deadline) return null;
    const today = localDateString();
    if (task.status !== "completed" && task.deadline < today) return { label: `Vencida · ${formatDate(task.deadline)}`, className: "overdue" };
    if (task.status !== "completed" && task.deadline === today) return { label: "Prazo hoje", className: "today" };
    return { label: `Prazo · ${formatDate(task.deadline)}`, className: "" };
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function getVisibleTasks() {
    const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
    const priority = elements.priorityFilter.value;
    const sort = elements.sort.value;
    const filtered = tasks.filter(task => {
      const matchesStatus = activeFilter === "all" || task.status === activeFilter;
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesQuery = !query || `${task.title} ${task.description}`.toLocaleLowerCase("pt-BR").includes(query);
      return matchesStatus && matchesPriority && matchesQuery;
    });

    filtered.sort((a, b) => {
      if (sort === "deadline") {
        const aDate = a.deadline || "9999-12-31";
        const bDate = b.deadline || "9999-12-31";
        return aDate.localeCompare(bDate) || PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || b.createdAt - a.createdAt;
      }
      if (sort === "created") return b.createdAt - a.createdAt;
      if (sort === "alphabetical") return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
      return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
        (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31") ||
        b.createdAt - a.createdAt;
    });
    return filtered;
  }

  function renderTask(task) {
    const deadline = getDeadlineInfo(task);
    const title = escapeHTML(task.title);
    const description = escapeHTML(task.description);
    const checked = task.status === "completed";
    return `
      <article class="task-card ${checked ? "is-completed" : ""}" data-task-id="${escapeHTML(task.id)}">
        <div class="task-card-top">
          <div class="task-heading">
            <button class="task-check ${checked ? "checked" : ""}" type="button" data-action="toggle" aria-label="${checked ? "Reabrir tarefa" : "Concluir tarefa"}" title="${checked ? "Reabrir tarefa" : "Marcar como concluída"}">${checked ? "✓" : ""}</button>
            <div><h3 class="task-title">${title}</h3></div>
          </div>
        </div>
        ${description ? `<p class="task-description">${description}</p>` : ""}
        <div class="task-badges">
          <span class="badge priority-${task.priority}">Prioridade ${PRIORITY_LABEL[task.priority]}</span>
          <span class="badge status-${task.status}">${STATUS_LABEL[task.status]}</span>
          ${deadline ? `<span class="badge deadline-badge ${deadline.className}">${deadline.label}</span>` : ""}
        </div>
        <div class="task-card-footer">
          <span class="task-created">Criada em ${formatDate(localDateString(new Date(task.createdAt)))}</span>
          <div class="task-actions">
            <button class="icon-button" type="button" data-action="edit" aria-label="Editar tarefa ${title}" title="Editar">✎</button>
            <button class="icon-button delete" type="button" data-action="delete" aria-label="Excluir tarefa ${title}" title="Excluir">⌫</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const visible = getVisibleTasks();
    elements.taskList.innerHTML = visible.map(renderTask).join("");
    elements.taskList.classList.toggle("list-view", listView);
    elements.emptyState.hidden = visible.length > 0;
    elements.taskList.hidden = visible.length === 0;
    $("#visible-count").textContent = String(visible.length);

    const labels = { all: "Suas tarefas", pending: "Tarefas pendentes", progress: "Tarefas em andamento", completed: "Tarefas concluídas" };
    $("#task-section-title").childNodes[0].textContent = `${labels[activeFilter]} `;
    $("#current-view-label").textContent = activeFilter === "all" ? "Visão geral" : STATUS_LABEL[activeFilter];
    $("#results-label").textContent = visible.length === tasks.length && activeFilter === "all" ? "Todas as tarefas" : `${visible.length} resultado(s) encontrado(s)`;

    if (!visible.length) {
      const hasTasks = tasks.length > 0;
      $("#empty-title").textContent = hasTasks ? "Nenhuma tarefa encontrada." : "Tudo começa com uma tarefa.";
      $("#empty-description").textContent = hasTasks
        ? "Tente mudar os filtros ou a busca para encontrar o que procura."
        : "Adicione sua primeira tarefa e transforme planos em progresso.";
      $("#empty-add-button").hidden = hasTasks;
    }

    const completed = tasks.filter(task => task.status === "completed").length;
    const progress = tasks.filter(task => task.status === "progress").length;
    const overdue = tasks.filter(task => task.status !== "completed" && task.deadline && task.deadline < localDateString()).length;
    $("#stat-total").textContent = tasks.length;
    $("#stat-progress").textContent = progress;
    $("#stat-completed").textContent = completed;
    $("#stat-overdue").textContent = overdue;
    $("#nav-all").textContent = tasks.length;
    $("#nav-pending").textContent = tasks.filter(task => task.status === "pending").length;
    $("#nav-progress").textContent = progress;
    $("#nav-completed").textContent = completed;
    document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.filter === activeFilter));
  }

  function openDialog(task = null) {
    elements.form.reset();
    elements.id.value = task ? task.id : "";
    elements.title.value = task ? task.title : "";
    elements.description.value = task ? task.description : "";
    elements.priority.value = task ? task.priority : "medium";
    elements.status.value = task ? task.status : "pending";
    elements.deadline.value = task ? task.deadline : "";
    $("#dialog-title").textContent = task ? "Editar tarefa" : "Nova tarefa";
    $("#save-task-button").innerHTML = task ? "Salvar alterações <span>→</span>" : "Salvar tarefa <span>→</span>";
    elements.error.hidden = true;
    elements.error.textContent = "";
    elements.dialog.showModal();
    window.setTimeout(() => elements.title.focus(), 30);
  }

  function closeDialog() {
    elements.dialog.close();
    elements.error.hidden = true;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
  }

  function showFormError(message) {
    elements.error.textContent = message;
    elements.error.hidden = false;
  }

  elements.form.addEventListener("submit", event => {
    event.preventDefault();
    const title = elements.title.value.trim();
    const description = elements.description.value.trim();
    if (title.length < 3 || title.length > 100) {
      showFormError("O título deve ter entre 3 e 100 caracteres.");
      elements.title.focus();
      return;
    }
    if (description.length > 500) {
      showFormError("A descrição pode ter no máximo 500 caracteres.");
      return;
    }
    const deadline = elements.deadline.value;
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      showFormError("Informe uma data de prazo válida.");
      return;
    }

    const id = elements.id.value;
    const existing = tasks.find(task => task.id === id);
    const task = {
      id: existing ? existing.id : createId(),
      title, description,
      priority: elements.priority.value,
      status: elements.status.value,
      deadline,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now()
    };
    if (existing) tasks = tasks.map(item => item.id === id ? task : item);
    else tasks.push(task);

    if (!persistTasks()) return;
    closeDialog();
    render();
    showToast(existing ? "Tarefa atualizada com sucesso." : "Tarefa criada com sucesso.");
  });

  elements.taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest("[data-task-id]");
    const task = tasks.find(item => item.id === card?.dataset.taskId);
    if (!task) return;

    if (button.dataset.action === "toggle") {
      const nextStatus = task.status === "completed" ? "pending" : "completed";
      tasks = tasks.map(item => item.id === task.id ? { ...item, status: nextStatus, updatedAt: Date.now() } : item);
      if (persistTasks()) {
        render();
        showToast(nextStatus === "completed" ? "Tarefa concluída. Mandou bem!" : "Tarefa reaberta.");
      }
    } else if (button.dataset.action === "edit") {
      openDialog(task);
    } else if (button.dataset.action === "delete") {
      const confirmed = window.confirm(`Excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`);
      if (!confirmed) return;
      tasks = tasks.filter(item => item.id !== task.id);
      if (persistTasks()) {
        render();
        showToast("Tarefa excluída.");
      }
    }
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      render();
    });
  });
  elements.search.addEventListener("input", render);
  elements.priorityFilter.addEventListener("change", render);
  elements.sort.addEventListener("change", render);
  $("#new-task-button").addEventListener("click", () => openDialog());
  $("#empty-add-button").addEventListener("click", () => openDialog());
  $("#close-dialog").addEventListener("click", closeDialog);
  $("#cancel-dialog").addEventListener("click", closeDialog);
  elements.dialog.addEventListener("click", event => {
    if (event.target === elements.dialog) closeDialog();
  });
  $("#clear-filters").addEventListener("click", () => {
    activeFilter = "all";
    elements.search.value = "";
    elements.priorityFilter.value = "all";
    elements.sort.value = "priority";
    render();
  });
  $("#list-view-button").addEventListener("click", event => {
    listView = !listView;
    document.querySelectorAll(".view-button").forEach(button => button.classList.remove("active"));
    event.currentTarget.classList.toggle("active", listView);
    document.querySelector(".view-button[aria-label='Visualização em cartões']").classList.toggle("active", !listView);
    render();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !elements.dialog.open) {
      event.preventDefault();
      elements.search.focus();
    }
  });

  const today = new Date();
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(today).replace(".", "");
  render();
})();
