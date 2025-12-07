import { todosAPI, productsAPI, customersAPI } from './api.js';
import { showModal, closeModal, showToast, getIcon } from './ui-components.js';
import { setLoading } from './state.js';

let allTodos = [];
let currentView = 'month'; // 'month', 'week', 'day'
let currentDate = new Date();

let previousView = 'dashboard'; // Default fallback

export async function initTodos() {
    console.log('Initializing Todos module...');

    // Helper to safely attach listeners
    const attachListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(event, handler);
            console.log(`Attached listener to #${id}`);
        } else {
            console.warn(`Element #${id} not found during initTodos`);
        }
    };

    // View Selector
    const viewSelect = document.getElementById('todo-view-select');
    if (viewSelect) {
        viewSelect.addEventListener('change', (e) => {
            currentView = e.target.value;
            renderTodoView();
        });
    }

    // Navigation Buttons
    attachListener('todo-prev-btn', 'click', () => navigateDate(-1));
    attachListener('todo-next-btn', 'click', () => navigateDate(1));
    attachListener('todo-today-btn', 'click', () => {
        currentDate = new Date();
        renderTodoView();
    });

    // CRITICAL: Attach Add Button Listener
    const addBtn = document.getElementById('add-todo-btn');
    if (addBtn) {
        console.log('Found add-todo-btn, attaching click listener');
        addBtn.addEventListener('click', (e) => {
            console.log('Add To-Do button clicked');
            e.preventDefault();
            openAddTodoModal();
        });
    } else {
        console.error('CRITICAL: add-todo-btn NOT FOUND in DOM');
    }

    // Header To-Do Button (Toggle Logic)
    const headerTodoBtn = document.getElementById('header-todo-btn');
    if (headerTodoBtn) {
        headerTodoBtn.addEventListener('click', () => {
            const todoView = document.getElementById('todo-view');
            const isTodoActive = todoView.classList.contains('active');

            if (isTodoActive) {
                // Go Back
                const targetView = previousView || 'dashboard';
                const navLink = document.querySelector(`.nav-link[data-view="${targetView}"]`);
                if (navLink) navLink.click();
            } else {
                // Save current view and Switch to To-Do
                const activeLink = document.querySelector('.nav-link.active');
                if (activeLink) previousView = activeLink.dataset.view;

                // Hide all views
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

                // Show To-Do view
                todoView.classList.add('active');

                // Close mobile menu if open
                const menuToggle = document.getElementById('mobile-menu-toggle');
                const navLinks = document.querySelector('.nav-links');
                if (menuToggle) menuToggle.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
            }
        });
    }

    // Mobile Menu Close Button
    const mobileCloseBtn = document.getElementById('mobile-menu-close');
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', () => {
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const navLinks = document.querySelector('.nav-links');
            if (menuToggle) menuToggle.classList.remove('active');
            if (navLinks) navLinks.classList.remove('active');
        });
    }

    // Mobile View Restriction
    const checkMobileView = () => {
        if (window.innerWidth <= 768) {
            // Force Day View on Mobile
            if (currentView !== 'day') {
                currentView = 'day';
                if (viewSelect) viewSelect.value = 'day';
                renderTodoView();
            }
            // Disable other options
            if (viewSelect) {
                Array.from(viewSelect.options).forEach(opt => {
                    if (opt.value !== 'day') opt.disabled = true;
                });
            }
        } else {
            // Enable options on desktop
            if (viewSelect) {
                Array.from(viewSelect.options).forEach(opt => opt.disabled = false);
            }
        }
    };

    // Check on init and resize
    checkMobileView();
    window.addEventListener('resize', checkMobileView);

    // Render initial view (empty)
    renderTodoView();

    // Load data
    await loadTodos();

    // Re-render with data
    renderTodoView();
}

async function loadTodos() {
    console.log('Loading todos from API...');
    try {
        setLoading(true);
        allTodos = await todosAPI.getAll();
        console.log(`Loaded ${allTodos.length} todos`);
    } catch (error) {
        console.error('Error loading todos:', error);
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

    if (!container) {
        console.warn('Calendar container not found');
        return;
    }

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
                <input type="checkbox" class="todo-checkbox" ${todo.isCompleted ? 'checked' : ''}>
                <span class="todo-title">${todo.description}</span>
            </div>
            <div class="todo-meta">
                ${todo.customer ? `<span>👤 ${todo.customer.name}</span>` : ''}
                ${todo.product ? `<span>📦 ${todo.product.name}</span>` : ''}
            </div>
        `;

        // Card Click -> Open Details
        card.addEventListener('click', () => openTodoDetails(todo));

        // Checkbox Click -> Toggle Status (Stop Propagation)
        const checkbox = card.querySelector('.todo-checkbox');
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't open details
        });
        checkbox.addEventListener('change', (e) => {
            toggleTodo(todo._id, e.target.checked);
        });

        container.appendChild(card);
    });

    // Expose toggle function globally for the inline checkbox (kept for compatibility if needed, but event listener is better)
    window.toggleTodo = async (id, checked) => {
        try {
            await todosAPI.update(id, { isCompleted: checked });
            const todo = allTodos.find(t => t._id === id);
            if (todo) todo.isCompleted = checked;
            // No full re-render needed, checkbox state is enough
            // Update UI class immediately
            const card = document.querySelector(`.todo-card input[type="checkbox"]`).closest('.todo-card'); // This selector is too broad, but we are inside the loop/scope usually. 
            // Actually, we should just let the re-render happen or toggle class manually if we had reference.
            // Since we are re-rendering on view change, let's just update the data.
            // But wait, if we don't re-render, the strikethrough won't appear until refresh?
            // The `renderDayView` creates elements.
            // Let's just re-render the view to be safe and consistent.
            renderTodoView();
        } catch (e) {
            showToast('Hiba a mentéskor', 'error');
        }
    };
}

async function openAddTodoModal(defaultDate = new Date(), todoToEdit = null) {
    console.log('Opening Add/Edit Todo Modal...');
    const dateStr = (todoToEdit ? new Date(todoToEdit.date) : defaultDate).toISOString().split('T')[0];
    const title = todoToEdit ? 'To-Do Szerkesztése' : 'Új To-Do';
    const btnText = todoToEdit ? 'Mentés' : 'Létrehozás';

    // 1. Show Modal Immediately with empty/loading states
    // New Order: Customer -> Product -> Date -> Description
    const content = `
        <form id="add-todo-form">
            <div class="form-group">
                <label>Vevő (Opcionális)</label>
                <div class="selected-customer-display">
                    <input type="text" id="todo-customer-name" class="form-control" placeholder="Nincs kiválasztva" readonly value="${todoToEdit?.customer?.name || ''}">
                    <input type="hidden" id="todo-customer-id" value="${todoToEdit?.customer?._id || ''}">
                    <button type="button" id="select-customer-btn" class="btn btn-secondary" title="Vevő kiválasztása">
                        ${getIcon('plus')}
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label>Termék (Opcionális)</label>
                <input type="text" id="todo-product-search" class="form-control" list="todo-product-list" placeholder="Keresés..." disabled value="${todoToEdit?.product?.name || ''}">
                <datalist id="todo-product-list">
                    <!-- Populated later -->
                </datalist>
                <input type="hidden" id="todo-product-id" value="${todoToEdit?.product?._id || ''}">
            </div>

            <div class="form-group">
                <label>Dátum</label>
                <input type="date" id="todo-date" class="form-control" value="${dateStr}">
            </div>

            <div class="form-group">
                <label>Leírás *</label>
                <input type="text" id="todo-desc" class="form-control" required autofocus value="${todoToEdit?.description || ''}">
            </div>

            <button type="submit" class="btn btn-primary btn-block">${btnText}</button>
        </form>
    `;

    const modal = showModal(title, content);

    // Elements
    const customerNameInput = modal.querySelector('#todo-customer-name');
    const customerIdInput = modal.querySelector('#todo-customer-id');
    const selectCustomerBtn = modal.querySelector('#select-customer-btn');

    const productInput = modal.querySelector('#todo-product-search');
    const productList = modal.querySelector('#todo-product-list');
    const prodIdInput = modal.querySelector('#todo-product-id');
    const form = modal.querySelector('#add-todo-form');

    // Customer Selection Handler
    selectCustomerBtn.addEventListener('click', () => {
        openCustomerSelectorModal((selectedCustomer) => {
            customerNameInput.value = selectedCustomer.name;
            customerIdInput.value = selectedCustomer._id;
        });
    });

    // Background Data Fetch (Products only now, Customers fetched on demand)
    console.log('Fetching products in background...');

    productsAPI.getAll()
        .then(products => {
            console.log(`Loaded ${products.length} products`);
            if (productList && productInput) {
                productList.innerHTML = products.map(p => `<option value="${p.name}" data-id="${p._id}">`).join('');
                productInput.disabled = false;
                if (!todoToEdit) productInput.placeholder = "Keresés termék név vagy kód alapján...";

                // Attach input listener for product search
                productInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    const product = products.find(p => p.name === val);
                    if (product) prodIdInput.value = product._id;
                    else prodIdInput.value = '';
                });
            }
        })
        .catch(e => {
            console.error('Error loading products:', e);
            if (productInput) productInput.placeholder = 'Hiba a betöltéskor';
        });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Submitting todo...');

        const desc = modal.querySelector('#todo-desc').value;
        const date = modal.querySelector('#todo-date').value;
        const customer = customerIdInput.value;
        const productId = prodIdInput.value;

        try {
            setLoading(true);

            if (todoToEdit) {
                // Update existing
                const updatedTodo = await todosAPI.update(todoToEdit._id, {
                    description: desc,
                    date: date || null,
                    customer: customer || null,
                    product: productId || null
                });

                // Update local list
                const index = allTodos.findIndex(t => t._id === todoToEdit._id);
                if (index !== -1) allTodos[index] = updatedTodo;

                showToast('Feladat frissítve!', 'success');
            } else {
                // Create new
                const newTodo = await todosAPI.create({
                    description: desc,
                    date: date || null,
                    customer: customer || null,
                    product: productId || null
                });
                allTodos.push(newTodo);
                showToast('Feladat létrehozva!', 'success');
            }

            allTodos.sort((a, b) => new Date(a.date) - new Date(b.date));
            closeModal();
            renderTodoView();
        } catch (error) {
            console.error('Error saving todo:', error);
            showToast('Hiba: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    });
}

function openCustomerSelectorModal(onSelect) {
    const content = `
        <div style="margin-bottom: 1rem;">
            <input type="text" id="customer-selector-search" class="form-control" placeholder="Keresés név alapján..." autofocus>
        </div>
        <div id="customer-selector-container" class="customer-selector-grid">
            <div class="loading-spinner"></div>
        </div>
    `;

    const modal = showModal('Vevő Kiválasztása', content);
    const container = modal.querySelector('#customer-selector-container');
    const searchInput = modal.querySelector('#customer-selector-search');

    let allCustomers = [];

    // Load Customers
    customersAPI.getAll().then(customers => {
        allCustomers = customers;
        renderCustomerGrid(customers);
    }).catch(e => {
        container.innerHTML = '<p class="text-danger">Hiba a vevők betöltésekor.</p>';
    });

    // Render Grid
    function renderCustomerGrid(customersToRender) {
        if (customersToRender.length === 0) {
            container.innerHTML = '<p class="text-muted">Nincs találat.</p>';
            return;
        }

        container.innerHTML = customersToRender.map(c => `
            <div class="customer-selector-card" data-id="${c._id}">
                <div style="color: var(--color-primary);">${getIcon('user')}</div>
                <div>
                    <div style="font-weight: 600;">${c.name}</div>
                    ${c.email ? `<div style="font-size: 0.8rem; color: var(--color-text-secondary);">${c.email}</div>` : ''}
                </div>
            </div>
        `).join('');

        // Attach click listeners
        container.querySelectorAll('.customer-selector-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const customer = allCustomers.find(c => c._id === id);
                if (customer) {
                    onSelect(customer);
                    // Close this modal (the selector), but keep the main one open
                    // showModal creates a new overlay. We need to remove ONLY this modal.
                    // The closeModal() function removes the *last* modal or clears container?
                    // ui-components.js closeModal clears the container! That's bad for stacked modals.
                    // But wait, showModal appends to container.
                    // Let's check ui-components.js.
                    // closeModal() clears innerHTML of container. This closes ALL modals.
                    // We need to close only the top one.
                    // The showModal returns the modal element. We can remove that specific element.
                    modal.remove();
                    // If no more modals, remove body class.
                    if (document.getElementById('modal-container').children.length === 0) {
                        document.body.classList.remove('modal-open');
                    }
                }
            });
        });
    }

    // Search Handler
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCustomers.filter(c => c.name.toLowerCase().includes(term));
        renderCustomerGrid(filtered);
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
            
            <div class="todo-details-actions">
                <button id="delete-todo-btn" class="btn btn-secondary btn-danger-text">
                    ${getIcon('trash-2')} Törlés
                </button>
                <div class="todo-action-group">
                    <button id="edit-todo-btn" class="btn btn-secondary">
                        ${getIcon('pencil')} Szerkesztés
                    </button>
                    <button id="toggle-todo-btn" class="btn ${todo.isCompleted ? 'btn-secondary' : 'btn-primary'}">
                        ${todo.isCompleted ? 'Visszaállítás' : 'Kész'}
                    </button>
                </div>
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

    modal.querySelector('#edit-todo-btn').addEventListener('click', () => {
        closeModal(); // Close details modal
        openAddTodoModal(new Date(todo.date), todo); // Open edit modal
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
