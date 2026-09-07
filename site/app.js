const storeKey = "debt-register-app";
const id = () => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const seedData = {
  customers: [
    { id: id(), name: "عميل 1", phone: "", note: "مثال تجريبي" },
    { id: id(), name: "عميل 2", phone: "", note: "مثال تجريبي" },
    { id: id(), name: "عميل 3", phone: "", note: "مثال تجريبي" }
  ],
  transactions: []
};

seedData.transactions = [
  { id: id(), customerId: seedData.customers[0].id, type: "debt", amount: 250000, date: "2026-09-07", note: "دين جديد" },
  { id: id(), customerId: seedData.customers[1].id, type: "payment", amount: 150000, date: "2026-09-07", note: "تسديد" },
  { id: id(), customerId: seedData.customers[2].id, type: "debt", amount: 400000, date: "2026-09-06", note: "دين جديد" }
];

let state = loadState();
const formatter = new Intl.NumberFormat("en-US");
const today = new Date().toISOString().slice(0, 10);

const els = {
  search: document.querySelector("#searchInput"),
  customersCount: document.querySelector("#customersCount"),
  totalDebt: document.querySelector("#totalDebt"),
  totalPaid: document.querySelector("#totalPaid"),
  remainingDebt: document.querySelector("#remainingDebt"),
  debtsCount: document.querySelector("#debtsCount"),
  paymentsCount: document.querySelector("#paymentsCount"),
  todayDebt: document.querySelector("#todayDebt"),
  todayPaid: document.querySelector("#todayPaid"),
  transactionsList: document.querySelector("#transactionsList"),
  customersList: document.querySelector("#customersList"),
  reportPaid: document.querySelector("#reportPaid"),
  reportLeft: document.querySelector("#reportLeft"),
  donut: document.querySelector("#donut"),
  restoreInput: document.querySelector("#restoreInput"),
  settingsStatus: document.querySelector("#settingsStatus")
};

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});

document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
});

document.querySelector("#clearSearch").addEventListener("click", () => {
  els.search.value = "";
  render();
});

els.search.addEventListener("input", render);
document.querySelector("#exportBtn").addEventListener("click", exportBackup);
document.addEventListener("click", handleSettingsClick);
els.restoreInput.addEventListener("change", restoreBackup);
document.querySelector("#customerForm").addEventListener("submit", saveCustomer);
document.querySelector("#debtForm").addEventListener("submit", (event) => saveTransaction(event, "debt"));
document.querySelector("#paymentForm").addEventListener("submit", (event) => saveTransaction(event, "payment"));

document.querySelectorAll("input[type='date']").forEach((input) => {
  input.value = today;
});

render();

function loadState() {
  const saved = localStorage.getItem(storeKey);
  return saved ? JSON.parse(saved) : seedData;
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function saveCustomer(event) {
  if (event.submitter?.value !== "save") return;
  const form = event.currentTarget;
  const data = new FormData(form);
  state.customers.unshift({
    id: id(),
    name: data.get("name").trim(),
    phone: data.get("phone").trim(),
    note: data.get("note").trim()
  });
  saveState();
  form.reset();
  render();
}

function saveTransaction(event, type) {
  if (event.submitter?.value !== "save") return;
  const form = event.currentTarget;
  const data = new FormData(form);
  state.transactions.unshift({
    id: id(),
    customerId: data.get("customer"),
    type,
    amount: Number(data.get("amount")),
    date: data.get("date"),
    note: data.get("note").trim()
  });
  saveState();
  form.reset();
  form.querySelector("input[type='date']").value = today;
  render();
}

function openModal(modalId) {
  updateCustomerOptions();
  document.querySelector(`#${modalId}`).showModal();
}

function updateCustomerOptions() {
  document.querySelectorAll("select[name='customer']").forEach((select) => {
    select.innerHTML = state.customers
      .map((customer) => `<option value="${customer.id}">${customer.name}</option>`)
      .join("");
  });
}

function showTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
}

function render() {
  const query = els.search.value.trim();
  const totals = calculateTotals();
  els.customersCount.textContent = state.customers.length;
  els.totalDebt.textContent = formatter.format(totals.debt);
  els.totalPaid.textContent = formatter.format(totals.paid);
  els.remainingDebt.textContent = formatter.format(totals.left);
  els.debtsCount.textContent = formatter.format(totals.debtCount);
  els.paymentsCount.textContent = formatter.format(totals.paymentCount);
  els.todayDebt.textContent = formatter.format(totals.todayDebt);
  els.todayPaid.textContent = formatter.format(totals.todayPaid);
  els.reportPaid.textContent = formatter.format(totals.paid);
  els.reportLeft.textContent = formatter.format(totals.left);

  const paidPercent = totals.debt ? Math.min(100, Math.round((totals.paid / totals.debt) * 100)) : 0;
  els.donut.style.background = `conic-gradient(var(--green) 0 ${paidPercent}%, var(--red) ${paidPercent}% 100%)`;

  renderTransactions(query);
  renderCustomers(query);
}

function calculateTotals() {
  const totals = { debt: 0, paid: 0, left: 0, debtCount: 0, paymentCount: 0, todayDebt: 0, todayPaid: 0 };
  state.transactions.forEach((transaction) => {
    if (transaction.type === "debt") {
      totals.debt += transaction.amount;
      totals.debtCount += 1;
      if (transaction.date === today) totals.todayDebt += transaction.amount;
    }
    if (transaction.type === "payment") {
      totals.paid += transaction.amount;
      totals.paymentCount += 1;
      if (transaction.date === today) totals.todayPaid += transaction.amount;
    }
  });
  totals.left = Math.max(0, totals.debt - totals.paid);
  return totals;
}

function getCustomer(customerId) {
  return state.customers.find((customer) => customer.id === customerId) || { name: "عميل محذوف", phone: "" };
}

function matchesCustomer(customer, query) {
  return !query || customer.name.includes(query) || customer.phone.includes(query);
}

function renderTransactions(query) {
  const rows = state.transactions
    .filter((transaction) => matchesCustomer(getCustomer(transaction.customerId), query))
    .slice(0, 12)
    .map((transaction) => {
      const customer = getCustomer(transaction.customerId);
      const typeLabel = transaction.type === "debt" ? "دين جديد" : "تسديد";
      const amountClass = transaction.type === "debt" ? "debt" : "payment";
      return `<article class="item"><div><h3>${customer.name}</h3><p>${typeLabel} - ${transaction.date}</p></div><strong class="amount ${amountClass}">${formatter.format(transaction.amount)}</strong><p>${transaction.note || customer.phone || "بدون ملاحظة"}</p></article>`;
    })
    .join("");
  els.transactionsList.innerHTML = rows || `<p class="empty">لا توجد عمليات مطابقة</p>`;
}

function renderCustomers(query) {
  const rows = state.customers
    .filter((customer) => matchesCustomer(customer, query))
    .map((customer) => {
      const balance = state.transactions
        .filter((transaction) => transaction.customerId === customer.id)
        .reduce((total, transaction) => total + (transaction.type === "debt" ? transaction.amount : -transaction.amount), 0);
      return `<article class="item"><div><h3>${customer.name}</h3><p>${customer.phone || "بدون رقم"}</p></div><strong class="amount ${balance > 0 ? "debt" : "payment"}">${formatter.format(Math.max(0, balance))}</strong><p>${customer.note || "عميل"}</p></article>`;
    })
    .join("");
  els.customersList.innerHTML = rows || `<p class="empty">لا يوجد عملاء مطابقون</p>`;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `debt-register-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showSettingsStatus("تم حفظ نسخة احتياطية من البيانات");
}

function handleSettingsClick(event) {
  const button = event.target.closest("#backupBtn, #restoreBtn, #formatBtn");
  if (!button) return;

  event.preventDefault();
  if (button.id === "backupBtn") exportBackup();
  if (button.id === "restoreBtn") els.restoreInput.click();
  if (button.id === "formatBtn") formatSystem();
}

function restoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const importedState = JSON.parse(reader.result);
      if (!isValidBackup(importedState)) {
        alert("ملف النسخة الاحتياطية غير صالح");
        return;
      }

      state = importedState;
      saveState();
      render();
      showSettingsStatus("تم استرجاع البيانات بنجاح");
    } catch {
      showSettingsStatus("تعذر قراءة ملف النسخة الاحتياطية");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function isValidBackup(data) {
  return Boolean(
    data &&
    Array.isArray(data.customers) &&
    Array.isArray(data.transactions) &&
    data.customers.every((customer) => customer.id && customer.name) &&
    data.transactions.every((transaction) =>
      transaction.id &&
      transaction.customerId &&
      ["debt", "payment"].includes(transaction.type) &&
      Number.isFinite(Number(transaction.amount))
    )
  );
}

function formatSystem() {
  const confirmed = confirm("هل أنت متأكد من فرمتة النظام؟ سيتم حذف كل العملاء والديون والتسديدات.");
  if (!confirmed) return;

  state = { customers: [], transactions: [] };
  saveState();
  render();
  showSettingsStatus("تمت فرمتة النظام بنجاح");
}

function showSettingsStatus(message) {
  if (!els.settingsStatus) return;
  els.settingsStatus.textContent = message;
  window.clearTimeout(showSettingsStatus.timer);
  showSettingsStatus.timer = window.setTimeout(() => {
    els.settingsStatus.textContent = "";
  }, 3500);
}
