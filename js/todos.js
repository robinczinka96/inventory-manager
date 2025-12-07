import { todosAPI, customersAPI, productsAPI } from './api.js';
import { showModal, closeModal, showToast, getIcon } from './ui-components.js';
import { setLoading } from './state.js';

let allTodos = [];
let currentView = 'month'; // 'month', 'week', 'day'
let currentDate = new Date();

export async function initTodos() {
    console.log('Initializing Todos...');

    // Initial load
    await loadTodos();

    // Render initial view
    renderTodoView();

    // Attach event listeners for view switching and navigation
    document.getElementById('todo-view-select').addEventListener('change', (e) => {
        currentView = e.target.value;
        renderTodoView();
    });

    document.getElementById('todo-prev-btn').addEventListener('click', () => {
        navigateDate(-1);
    });

    document.getElementById('todo-next-btn').addEventListener('click', () => {
        navigateDate(1);
    });

    document.getElementById('todo-today-btn').addEventListener('click', () => {
        currentDate = new Date();
        renderTodoView();
    });

    document.getElementById('add-todo-btn').addEventListener('click', openAddTodoModal);
}

async function loadTodos() {
    try {
        setLoading(true);
        allTodos = await todosAPI.getAll();
    } catch (error) {
        showToast('Hiba a feladatok betöltésekor: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

function navigateDate(direction) {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
        currentDate.setDate(currentDate.getDate() + direction);
    }
    renderTodoView();
}

function renderTodoView() {
    const container = document.getElementById('todo-calendar-container');
    const titleEl = document.getElementById('todo-current-date-title');

    if (!container) return;

    // Update Title
    const options = { year: 'numeric', month: 'long' };
    if (currentView !== 'month') options.day = 'numeric';
    titleEl.textContent = currentDate.toLocaleDateString('hu-HU', options);

    // Render specific view
    if (currentView === 'month') {
        renderMonthView(container);
    } else if (currentView === 'week') {
        renderWeekView(container);
    } else {
        renderDayView(container);
    }
}

function renderMonthView(container) {
    container.className = 'calendar-month-grid';
    container.innerHTML = '';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Adjust for Monday start (0=Sun, 1=Mon...)
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = lastDay.getDate();

    // Headers
    const days = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];
    days.forEach(d => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = d;
        container.appendChild(header);
    });

    // Empty slots before first day
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        container.appendChild(empty);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Check if today
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }

        dayEl.innerHTML = `<div class="day-number">${i}</div>`;

        // Find todos for this day
        const dayTodos = allTodos.filter(t => {
            if (!t.date) return false;
            const tDate = new Date(t.date);
            return tDate.getDate() === i && tDate.getMonth() === month && tDate.getFullYear() === year;
        });

        dayTodos.forEach(todo => {
            const todoEl = document.createElement('div');
            todoEl.className = `calendar-event ${todo.isCompleted ? 'completed' : ''}`;
            todoEl.textContent = todo.description || 'Névtelen feladat';
            todoEl.title = todo.description;
            todoEl.onclick = (e) => {
                e.stopPropagation();
                openTodoDetails(todo);
            };
            dayEl.appendChild(todoEl);
        });

        // Click on empty day to add todo
        dayEl.onclick = () => {
            openAddTodoModal(new Date(year, month, i));
        };

        container.appendChild(dayEl);
    }
}

function renderWeekView(container) {
    container.className = 'calendar-week-grid';
    container.innerHTML = '';

    // Calculate start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay() || 7; // Make Sunday 7
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);

        const col = document.createElement('div');
        col.className = 'calendar-week-col';

        const header = document.createElement('div');
        header.className = 'week-header';
        header.innerHTML = `
            <div class="day-name">${currentDay.toLocaleDateString('hu-HU', { weekday: 'short' })}</div>
            <div class="day-num">${currentDay.getDate()}</div>
        `;
        col.appendChild(header);

        // Todos
        const dayTodos = allTodos.filter(t => {
            if (!t.date) return false;
            const tDate = new Date(t.date);
            return tDate.toDateString() === currentDay.toDateString();
        });

        dayTodos.forEach(todo => {
            const todoEl = document.createElement('div');
            todoEl.className = `calendar-event ${todo.isCompleted ? 'completed' : ''}`;
            todoEl.innerHTML = `
                <div style="font-weight: 600;">${todo.description}</div>
                ${todo.customer ? `<div style="font-size: 0.8em;">👤 ${todo.customer.name}</div>` : ''}
            `;
            todoEl.onclick = () => openTodoDetails(todo);
            col.appendChild(todoEl);
        });

        col.onclick = (e) => {
            if (e.target === col) openAddTodoModal(currentDay);
        }

        container.appendChild(col);
    }
}

function renderDayView(container) {
    container.className = 'calendar-day-view';
    container.innerHTML = '';

    const dayTodos = allTodos.filter(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date);
        return tDate.toDateString() === currentDate.toDateString();
    });

    if (dayTodos.length === 0) {
        container.innerHTML = '<p class="empty-state">Nincs feladat erre a napra.</p>';
        return;
    }

    dayTodos.forEach(todo => {
        const card = document.createElement('div');
        card.className = `todo-card ${todo.isCompleted ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="todo-header">
                <input type="checkbox" ${todo.isCompleted ? 'checked' : ''} onchange="toggleTodo('${todo._id}', this.checked)">
                <span class="todo-title">${todo.description}</span>
            </div>
            <div class="todo-meta">
                ${todo.customer ? `<span>👤 ${todo.customer.name}</span>` : ''}
                ${todo.product ? `<span>📦 ${todo.product.name}</span>` : ''}
            </div>
        `;
        container.appendChild(card);
    });

    // Expose toggle function globally for the inline checkbox
    window.toggleTodo = async (id, checked) => {
        try {
            await todosAPI.update(id, { isCompleted: checked });
            const todo = allTodos.find(t => t._id === id);
            if (todo) todo.isCompleted = checked;
            // No full re-render needed, checkbox state is enough
        } catch (e) {
            showToast('Hiba a mentéskor', 'error');
        }
    };
}

async function openAddTodoModal(defaultDate = new Date()) {
    // Load customers and products for select
    let customers = [], products = [];
    try {
        [customers, products] = await Promise.all([
            customersAPI.getAll(),
            productsAPI.getAll()
        ]);
    } catch (e) {
        console.error(e);
    }

    const dateStr = defaultDate.toISOString().split('T')[0];

    const content = `
        <form id="add-todo-form">
            <div class="form-group">
                <label>Leírás *</label>
                <input type="text" id="todo-desc" class="form-control" required>
            </div>
            <div class="form-group">
                <label>Dátum</label>
                <input type="date" id="todo-date" class="form-control" value="${dateStr}">
            </div>
            <div class="form-group">
                <label>Vevő (Opcionális)</label>
                <select id="todo-customer" class="form-control">
                    <option value="">Nincs kiválasztva</option>
                    ${customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Termék (Opcionális)</label>
                <input type="text" id="todo-product-search" class="form-control" list="todo-product-list" placeholder="Keresés...">
                <datalist id="todo-product-list">
                    ${products.map(p => `<option value="${p.name}" data-id="${p._id}">`).join('')}
                </datalist>
                <input type="hidden" id="todo-product-id">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Mentés</button>
        </form>
    `;

    const modal = showModal('Új Feladat', content);

    // Handle product search input to set hidden ID
    const prodInput = modal.querySelector('#todo-product-search');
    const prodIdInput = modal.querySelector('#todo-product-id');

    prodInput.addEventListener('input', (e) => {
        const val = e.target.value;
        const product = products.find(p => p.name === val);
        if (product) prodIdInput.value = product._id;
        else prodIdInput.value = '';
    });

    modal.querySelector('#add-todo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = modal.querySelector('#todo-desc').value;
        const date = modal.querySelector('#todo-date').value;
        const customer = modal.querySelector('#todo-customer').value;
        const productId = prodIdInput.value;

        try {
            setLoading(true);
            const newTodo = await todosAPI.create({
                description: desc,
                date: date || null,
                customer: customer || null,
                product: productId || null
            });

            allTodos.push(newTodo);
            allTodos.sort((a, b) => new Date(a.date) - new Date(b.date));

            showToast('Feladat mentve!', 'success');
            closeModal();
            renderTodoView();
        } catch (error) {
            showToast('Hiba: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    });
}

function openTodoDetails(todo) {
    const content = `
        <div style="margin-bottom: 1rem;">
            <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">${todo.description}</div>
            <div style="color: var(--color-text-secondary); margin-bottom: 1rem;">
                ${new Date(todo.date).toLocaleDateString('hu-HU')}
            </div>
            
            ${todo.customer ? `<div style="margin-bottom: 0.5rem;"><strong>Vevő:</strong> ${todo.customer.name}</div>` : ''}
            ${todo.product ? `<div style="margin-bottom: 0.5rem;"><strong>Termék:</strong> ${todo.product.name}</div>` : ''}
            
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                <button id="delete-todo-btn" class="btn btn-secondary" style="color: var(--color-danger);">Törlés</button>
                <button id="toggle-todo-btn" class="btn ${todo.isCompleted ? 'btn-secondary' : 'btn-primary'}">
                    ${todo.isCompleted ? 'Visszaállítás' : 'Kész'}
                </button>
            </div>
        </div>
    `;

    const modal = showModal('Feladat Részletei', content);

    modal.querySelector('#delete-todo-btn').addEventListener('click', async () => {
        if (confirm('Biztosan törölni szeretnéd?')) {
            try {
                await todosAPI.delete(todo._id);
                allTodos = allTodos.filter(t => t._id !== todo._id);
                renderTodoView();
                closeModal();
                showToast('Törölve', 'success');
            } catch (e) { showToast(e.message, 'error'); }
        }
    });

    modal.querySelector('#toggle-todo-btn').addEventListener('click', async () => {
        try {
            const newState = !todo.isCompleted;
            await todosAPI.update(todo._id, { isCompleted: newState });
            todo.isCompleted = newState;
            renderTodoView();
            closeModal();
            showToast(newState ? 'Feladat kész!' : 'Feladat visszaállítva', 'success');
        } catch (e) { showToast(e.message, 'error'); }
    });
}
