const taskInput     = document.getElementById('task-input');
const addBtn        = document.getElementById('add-btn');
const taskList      = document.getElementById('task-list');
const emptyState    = document.getElementById('empty-state');
const prioritySelect= document.getElementById('priority-select');
const dueDateInput  = document.getElementById('due-date');
const dueTimeInput  = document.getElementById('due-time');
const tabs          = document.querySelectorAll('.tab');
const clearBtn      = document.getElementById('clear-btn');
const doneCount     = document.getElementById('done-count');
const totalCount    = document.getElementById('total-count');
const progressFill  = document.getElementById('progress-fill');
const remainingCount= document.getElementById('remaining-count');
const todayDate     = document.getElementById('today-date');
const toast         = document.getElementById('toast');

let tasks  = JSON.parse(localStorage.getItem('tasks') || '[]');
let filter = 'all';
let toastTimer;

/* ─── Init ─────────────────────────────────────── */
(function init() {
  todayDate.textContent = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  }).format(new Date());

  render();
})();

/* ─── Events ────────────────────────────────────── */
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filter = tab.dataset.filter;
    render();
  });
});

clearBtn.addEventListener('click', () => {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) {
    showToast('삭제할 완료 항목이 없습니다');
    return;
  }
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
  showToast(`완료된 ${completedCount}개 항목을 삭제했습니다`);
});

/* ─── Core Logic ────────────────────────────────── */
function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    taskInput.focus();
    taskInput.classList.add('shake');
    setTimeout(() => taskInput.classList.remove('shake'), 400);
    showToast('할일 내용을 입력해주세요');
    return;
  }

  const task = {
    id:        Date.now(),
    text,
    priority:  prioritySelect.value,
    dueDate:   dueDateInput.value,
    dueTime:   dueDateInput.value ? dueTimeInput.value : '',
    completed: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  save();

  taskInput.value      = '';
  dueDateInput.value   = '';
  dueTimeInput.value   = '';
  prioritySelect.value = 'normal';
  taskInput.focus();

  if (filter === 'completed') {
    tabs[0].click();
  } else {
    render();
  }

  showToast('할일이 추가되었습니다');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    save();
    render();
  }
}

function deleteTask(id) {
  const li = document.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.classList.add('removing');
    li.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }, { once: true });
  }
  showToast('할일이 삭제되었습니다');
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const li   = document.querySelector(`[data-id="${id}"]`);
  const span = li.querySelector('.task-text');

  const input = document.createElement('input');
  input.type  = 'text';
  input.value = task.text;
  input.className = 'task-edit-input';
  input.maxLength = 100;

  span.replaceWith(input);
  input.focus();
  input.select();

  li.querySelector('.edit-btn').style.display = 'none';

  const confirm = () => {
    const newText = input.value.trim();
    if (newText && newText !== task.text) {
      task.text = newText;
      save();
      showToast('수정되었습니다');
    }
    render();
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') render();
  });
  input.addEventListener('blur', confirm);
}

/* ─── Render ────────────────────────────────────── */
function render() {
  const filtered = getFiltered();

  // Update stats
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const remaining = total - completed;

  doneCount.textContent    = completed;
  totalCount.textContent   = total;
  progressFill.style.width = total ? `${(completed / total) * 100}%` : '0%';
  remainingCount.textContent = remaining > 0 ? `남은 할일 ${remaining}개` : total > 0 ? '모두 완료!' : '';

  // Clear list (keep empty-state template)
  Array.from(taskList.children).forEach(child => {
    if (!child.classList.contains('empty-state-template')) {
      taskList.removeChild(child);
    }
  });
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const emptyMsg = {
      all: { p: '할일이 없습니다', span: '위에서 새 할일을 추가해보세요!' },
      active: { p: '진행중인 할일이 없습니다', span: '모든 할일을 완료했어요!' },
      completed: { p: '완료된 할일이 없습니다', span: '할일을 완료하면 여기에 표시돼요.' }
    }[filter];

    taskList.innerHTML = `
      <li class="empty-state">
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="8" y="12" width="48" height="44" rx="6" stroke="currentColor" stroke-width="2"/>
          <path d="M22 2v8M42 2v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 24h48" stroke="currentColor" stroke-width="2"/>
          <path d="M22 36h20M22 44h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>${emptyMsg.p}</p>
        <span>${emptyMsg.span}</span>
      </li>`;
    return;
  }

  filtered.forEach(task => {
    taskList.appendChild(createTaskEl(task));
  });
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = `task-item priority-${task.priority}${task.completed ? ' completed' : ''}`;
  li.dataset.id = task.id;

  const priorityLabel = { high: '높음', normal: '보통', low: '낮음' }[task.priority];

  const dueLabelHtml = task.dueDate ? (() => {
    const dateStr = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(task.dueDate));

    let isOver = false;
    if (!task.completed) {
      if (task.dueTime) {
        const dueDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
        isOver = dueDateTime < new Date();
      } else {
        const dueDay = new Date(task.dueDate);
        const today  = new Date(); today.setHours(0,0,0,0);
        isOver = dueDay < today;
      }
    }

    const timeStr = task.dueTime
      ? ` · ${task.dueTime.slice(0,5)}`
      : '';

    return `<span class="due-label${isOver ? ' overdue' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      ${isOver ? '기한 초과 · ' : ''}${dateStr}${timeStr}
    </span>`;
  })() : '';

  li.innerHTML = `
    <div class="checkbox-wrap">
      <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} title="완료 표시" />
    </div>
    <div class="task-content">
      <span class="task-text">${escapeHtml(task.text)}</span>
      <div class="task-meta">
        <span class="badge badge-${task.priority}">${priorityLabel}</span>
        ${dueLabelHtml}
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit-btn" title="수정">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="action-btn delete-btn" title="삭제">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`;

  li.querySelector('.checkbox').addEventListener('change', () => toggleTask(task.id));
  li.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
  li.querySelector('.edit-btn').addEventListener('click', () => editTask(task.id));

  return li;
}

/* ─── Helpers ───────────────────────────────────── */
function getFiltered() {
  return tasks.filter(t => {
    if (filter === 'active')    return !t.completed;
    if (filter === 'completed') return  t.completed;
    return true;
  });
}

function save() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
