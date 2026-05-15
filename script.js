const stored = JSON.parse(localStorage.getItem("expenses"));
const expenses = stored || [];
const expenseList = document.getElementById("expense-list");
const CATEGORIES = ["needed", "worth-it", "bullshit"];
const totalsEl = document.getElementById("totals");
const streakEl = document.getElementById("streak");
// const exportBtn = document.getElementById("export-btn");
let armedDeleteId = null;

function getTodayLocal() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`
}

function previousDay(isoString) {
    const d = new Date(isoString);
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`
}

function hasBullshitOn(dateString) {
    return expenses.some(e => e.date === dateString && e.currentCategory === "bullshit");
}

function computeStreak() {
    const today = getTodayLocal();
    let pointer = previousDay(today);
    const todayClean = !hasBullshitOn(today);
    let days = 0;
    while (!hasBullshitOn(pointer) && days < 365) {
        days++;
        pointer = previousDay(pointer);
    }
    return { days, todayClean };
}

function renderStreak() {
    const { days, todayClean } = computeStreak();
    let streakText = "";

    if (days === 0 && !todayClean) {
        streakText = "Bullshit spending spree — 0 days, today ruined";
    } else if (days === 0 && todayClean) {
        streakText = "0 days yet — today still clean";
    } else if (days > 0 && !todayClean) {
        streakText = `${days} days clean — today ruined it`;
    } else if (days > 0 && todayClean) {
        streakText = `🔥 ${days} days clean — today still going`;
    }
    const streakClass = todayClean ? "streak-going" : "streak-broken";
    streakEl.innerHTML = `<div class="streak-text ${streakClass}">${streakText}</div>`;
}

function renderExpenses() {
    let html = "";
    for (const expense of expenses) {
        const isRegretted = expense.currentCategory === "bullshit" && expense.originalCategory !== "bullshit";
        const isArmed = expense.id === armedDeleteId;

        html += `
            <li class="expense">
                <span class="expense-description">${expense.description}</span>
                <span class="expense-meta">${expense.date}</span>
                <span class="expense-amount">$${expense.amount}</span>
                <span class="expense-meta">${expense.type}</span>
                <span class="expense-category category-${expense.currentCategory}">${expense.currentCategory}</span>
                ${isRegretted ? `<span class="regretted">(regretted)</span>` : ""}
                <button class="review-btn" data-id="${expense.id}">review</button>
                <button class="delete-btn ${isArmed ? "armed" : ""}" data-id="${expense.id}">${isArmed ? "confirm?" : "🗑️"}</button>
            </li>
        `;
    }
    expenseList.innerHTML = html;
}

function totalForCategory(category) {
    return expenses
        .filter(e => e.currentCategory === category)
        .reduce((acc, e) => acc + e.amount, 0);
}

function renderTotals() {
    const neededTotal = totalForCategory("needed");
    const worthItTotal = totalForCategory("worth-it");
    const bullshitTotal = totalForCategory("bullshit");
    const actualTotal = expenses.reduce((acc, e) => acc + e.amount, 0);

    totalsEl.innerHTML = `
        <div class="total-row total-needed">
            <span class="total-label">Needed</span>
            <span class="total-amount">$${neededTotal}</span>
        </div>
        <div class="total-row total-worth-it">
            <span class="total-label">Worth It</span>
            <span class="total-amount">$${worthItTotal}</span>
        </div>
        <div class="total-row total-bullshit">
            <span class="total-label">Bullshit</span>
            <span class="total-amount">$${bullshitTotal}</span>
        </div>
        <div class="total-row total-grand">
            <span class="total-label">Total</span>
            <span class="total-amount">$${actualTotal}</span>
        </div>
    `;
}

const form = document.getElementById("expense-form");
form.addEventListener("submit", function (event) {
    event.preventDefault();
    console.log("form submitted!");
    const formData = new FormData(form);
    const description = formData.get("description");
    const amount = Number(formData.get("amount"));
    const date = formData.get("date");
    const type = formData.get("type");
    const category = formData.get("category");
    addExpense({
        description,
        amount,
        date,
        type,
        originalCategory: category,
        currentCategory: category,
    });
    form.reset();
    closeSheet();
});

function addExpense(expenseData) {
    const newExpense = {
        id: Date.now(),
        ...expenseData,
    };
    expenses.push(newExpense);
    armedDeleteId = null;
    saveAndRender();
}

expenseList.addEventListener("click", function (event) {
    const reviewBtn = event.target.closest(".review-btn");
    const deleteBtn = event.target.closest(".delete-btn");
    if (event.target.matches(".review-btn")) {
        armedDeleteId = null;
        const id = Number(reviewBtn.dataset.id);
        const expense = expenses.find(e => e.id === id);
        const currentIndex = CATEGORIES.indexOf(expense.currentCategory);
        const nextIndex = (currentIndex + 1) % CATEGORIES.length;
        expense.currentCategory = CATEGORIES[nextIndex];
        saveAndRender();
    }
    else if (event.target.closest(".delete-btn")) {
        const id = Number(deleteBtn.dataset.id);
        if (armedDeleteId === id) {
            const index = expenses.findIndex(e => e.id === id);
            expenses.splice(index, 1);
            armedDeleteId = null;
            saveAndRender();
        } else {
            armedDeleteId = id;
            renderExpenses();
        }

    }
});

function renderAll() {
    renderExpenses();
    renderTotals();
    renderStreak();
}

const fab = document.getElementById("fab");
const sheet = document.getElementById("sheet");
const sheetBackdrop = document.getElementById("sheet-backdrop");

function openSheet() {
    sheet.hidden = false;
    sheetBackdrop.hidden = false;
    fab.classList.add("fab-open");
}

function closeSheet() {
    sheet.hidden = true;
    sheetBackdrop.hidden = true;
    fab.classList.remove("fab-open");
}

fab.addEventListener("click", function () {
    if (sheet.hidden) {
        openSheet();
    } else {
        closeSheet();
    }
});

sheetBackdrop.addEventListener("click", closeSheet);

const navBtn = document.querySelectorAll(".nav-btn");
const allView = document.querySelectorAll(".view");
const nav = document.querySelector(".bottom-nav");

function switchView(viewName) {
    allView.forEach(view => {
        if (view.dataset.view === viewName) {
            view.hidden = false;
        } else {
            view.hidden = true;
        }
    });
    navBtn.forEach(btn => {
        if (btn.dataset.nav === viewName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

nav.addEventListener("click", function (event) {
    const clickedBtn = event.target.closest(".nav-btn");
    if (clickedBtn) {
        switchView(clickedBtn.dataset.nav);
    }
});

function saveAndRender() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    renderAll();
}

function exportExpenses() {
    const data = JSON.stringify(expenses, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${getTodayLocal()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
// exportBtn.addEventListener("click", exportExpenses);
renderAll();