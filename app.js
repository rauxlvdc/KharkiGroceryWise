'use strict';

const CATEGORIES = ["Vegetables", "Fruits", "Meat", "Seafood", "Dairy & Eggs", "Rice & Grains", "Pantry Essentials", "Beverages", "Snacks", "Household", "Personal Care", "Other"];
const UNIT_LABELS = { g: "gram", kg: "kg", piece: "piece", pack: "pack", bottle: "bottle", can: "can", liter: "liter", ml: "ml" };
const $ = id => document.getElementById(id);
const money = value => "₱" + Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const load = (key, fallback) => {
  try { const value = JSON.parse(localStorage.getItem("kgw_" + key)); return value ?? fallback; }
  catch { return fallback; }
};
const makeId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`);
let items = Array.isArray(load("items", [])) ? load("items", []) : [];
let history = Array.isArray(load("history", [])) ? load("history", []) : [];
let budget = Math.max(0, Number(load("budget", 0)) || 0);
let toastTimer;
let installPrompt = null;

function persist() {
  try {
    localStorage.setItem("kgw_items", JSON.stringify(items));
    localStorage.setItem("kgw_history", JSON.stringify(history));
    localStorage.setItem("kgw_budget", JSON.stringify(budget));
  } catch (error) { toast("Could not save. Check your browser storage settings."); }
}
function itemTotal(item) {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.price) || 0;
  if (item.unit === "g" || item.unit === "ml") return quantity * price / 1000;
  return quantity * price;
}
function unitPriceLabel(item) {
  const base = item.unit === "g" ? "kg" : item.unit === "ml" ? "liter" : (UNIT_LABELS[item.unit] || item.unit);
  return `${money(item.price)}/${base}`;
}
function quantityLabel(item) { return `${Number(item.quantity).toLocaleString("en-PH")} ${item.unit}`; }
function total(list = items) { return list.reduce((sum, item) => sum + itemTotal(item), 0); }
function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
function populateCategories() {
  $("item-category").innerHTML = CATEGORIES.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
  $("filter-category").innerHTML = '<option value="">All categories</option>' + CATEGORIES.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join("");
}
function filteredItems() {
  const query = $("search-items").value.trim().toLocaleLowerCase();
  const category = $("filter-category").value;
  const status = $("filter-status").value;
  return items.filter(item => (!query || item.name.toLocaleLowerCase().includes(query)) && (!category || item.category === category) && (!status || (status === "bought" ? item.bought : !item.bought)));
}
function emptyState(message, detail, withButton = false) {
  return `<div class="empty-state"><div class="empty-icon">🧺</div><strong>${message}</strong><p>${detail}</p>${withButton ? '<button class="primary-btn" data-empty-add>＋ Add your first item</button>' : ""}</div>`;
}
function tableHTML(rows, actions) {
  if (!rows.length) return emptyState(actions ? "Your grocery list is ready for a fresh start" : "Nothing here just yet", actions ? "Add your first item to see your estimated expenses here." : "Your recently added items will appear here.", actions);
  return `<table class="data-table"><thead><tr><th>ITEM</th><th>CATEGORY</th><th>QUANTITY</th><th>UNIT PRICE</th><th>TOTAL</th>${actions ? "<th>STATUS</th><th>ACTIONS</th>" : ""}</tr></thead><tbody>${rows.map(item => `<tr><td class="item-title">${esc(item.name)}</td><td>${esc(item.category)}</td><td>${esc(quantityLabel(item))}</td><td>${esc(unitPriceLabel(item))}</td><td class="price-cell">${money(itemTotal(item))}</td>${actions ? `<td><button class="status ${item.bought ? "bought" : ""}" data-action="toggle" data-id="${esc(item.id)}" aria-label="Mark ${esc(item.name)} ${item.bought ? "to buy" : "as purchased"}">${item.bought ? "Purchased" : "To buy"}</button></td><td><button class="table-action" data-action="edit" data-id="${esc(item.id)}" aria-label="Edit ${esc(item.name)}">✎</button><button class="table-action" data-action="delete" data-id="${esc(item.id)}" aria-label="Delete ${esc(item.name)}">×</button></td>` : ""}</tr>`).join("")}</tbody></table>`;
}
function render() {
  const sum = total();
  const remaining = budget - sum;
  const percent = budget > 0 ? sum / budget * 100 : 0;
  const pending = items.filter(item => !item.bought).length;
  $("budget-value").textContent = money(budget);
  $("spent-value").textContent = money(sum);
  $("remaining-value").textContent = money(remaining);
  $("remaining-value").classList.toggle("green", remaining >= 0);
  $("item-count").textContent = `${items.length} item${items.length === 1 ? "" : "s"} · ${pending} to buy`;
  $("budget-status").textContent = budget <= 0 ? "Set a budget to get started" : remaining < 0 ? `Over budget by ${money(Math.abs(remaining))}` : "Available for the rest of your list";
  $("progress-percent").textContent = Math.round(percent) + "%";
  $("progress-bar").style.width = Math.min(100, percent) + "%";
  $("progress-bar").classList.toggle("over-budget", percent > 100);
  $("progress-amount").textContent = `${money(sum)} / ${money(budget)}`;
  const categories = CATEGORIES.map(name => ({ name, value: total(items.filter(item => item.category === name)) })).filter(category => category.value > 0).sort((a, b) => b.value - a.value);
  $("category-breakdown").innerHTML = categories.length ? categories.map(category => `<div class="category-line"><span class="cat-name">${esc(category.name)}</span><div class="mini-track"><span style="width:${sum ? category.value / sum * 100 : 0}%"></span></div><span class="cat-amount">${money(category.value)}</span></div>`).join("") : '<div class="empty-small">Your category totals will appear here.</div>';
  $("overview-items").innerHTML = tableHTML(items.slice(0, 5), false);
  $("grocery-items").innerHTML = tableHTML(filteredItems(), true);
  $("list-total").textContent = money(sum);
  $("list-remaining-label").textContent = budget > 0 ? "Budget remaining" : "Budget not set";
  $("list-remaining").textContent = budget > 0 ? money(remaining) : "—";
  $("history-items").innerHTML = history.length ? history.map(entry => `<div class="history-entry"><div><strong>${esc(entry.title)}</strong><p>${new Date(entry.date).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })} · ${entry.count} item${entry.count === 1 ? "" : "s"} · ${entry.purchasedCount || 0} purchased</p></div><div class="history-price">${money(entry.total)}</div></div>`).join("") : emptyState("No saved shopping trips yet", "When you finish shopping, save a snapshot of your list here.");
}
function showView(view) {
  document.querySelectorAll(".view").forEach(section => section.classList.toggle("active", section.id === view + "-view"));
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("page-title").textContent = { overview: "Good planning starts here.", list: "Your grocery list.", history: "Your shopping history." }[view] || "GroceryWise";
}
function openItem(item = null) {
  $("item-form").reset();
  $("item-id").value = item?.id || "";
  $("item-modal-title").textContent = item ? "Edit item" : "Add an item";
  $("item-name").value = item?.name || "";
  $("item-category").value = item?.category || "Vegetables";
  $("item-unit").value = item?.unit || "g";
  $("item-quantity").value = item?.quantity ?? "";
  $("item-price").value = item?.price ?? "";
  $("item-bought").checked = !!item?.bought;
  updatePriceFields();
  $("item-dialog").showModal();
  $("item-name").focus();
}
function updatePriceFields() {
  const unit = $("item-unit").value;
  const weight = unit === "g" || unit === "kg";
  const volume = unit === "ml" || unit === "liter";
  $("quantity-label").firstChild.textContent = `Quantity (${unit})`;
  $("price-label").firstChild.textContent = weight ? "Price per kg (₱)" : volume ? "Price per liter (₱)" : `Price per ${UNIT_LABELS[unit] || unit} (₱)`;
  $("item-price").placeholder = weight ? "e.g. 80" : volume ? "e.g. 95" : "e.g. 25";
  updatePreview();
}
function updatePreview() {
  const unit = $("item-unit").value;
  const quantity = Number($("item-quantity").value) || 0;
  const price = Number($("item-price").value) || 0;
  const result = (unit === "g" || unit === "ml") ? quantity * price / 1000 : quantity * price;
  $("item-total-preview").textContent = money(result);
  const base = unit === "g" ? "kg" : unit === "ml" ? "liter" : unit;
  const formula = unit === "g" || unit === "ml" ? `${quantity || 0} ${unit} × ${money(price)} per ${base} ÷ 1,000` : `${quantity || 0} ${unit} × ${money(price)} per ${base}`;
  $("calc-explanation").textContent = formula;
}
function deleteItem(id) {
  const item = items.find(entry => entry.id === id);
  if (item && confirm(`Delete ${item.name} from your grocery list?`)) {
    items = items.filter(entry => entry.id !== id); persist(); render(); toast("Item deleted");
  }
}
function saveTrip() {
  if (!items.length) { toast("Add items before saving a shopping trip"); return; }
  const purchased = items.filter(item => item.bought);
  const toArchive = purchased.length ? purchased : items;
  if (!purchased.length && !confirm("No items are marked purchased. Save the entire list as a trip anyway?")) return;
  history.unshift({ title: "Grocery trip", date: new Date().toISOString(), count: toArchive.length, purchasedCount: purchased.length, total: total(toArchive) });
  history = history.slice(0, 50);
  items = purchased.length ? items.filter(item => !item.bought) : [];
  persist(); render(); toast(purchased.length ? "Purchased items saved. To-buy items kept on your list." : "Shopping trip saved to history");
}
function exportCSV() {
  if (!items.length) { toast("Your list is empty. Add an item before exporting."); return; }
  const columns = ["Item", "Category", "Quantity", "Unit", "Unit price (PHP)", "Estimated total (PHP)", "Status"];
  const rows = items.map(item => [item.name, item.category, item.quantity, item.unit, Number(item.price).toFixed(2), itemTotal(item).toFixed(2), item.bought ? "Purchased" : "To buy"]);
  const csv = [columns, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `grocerywise-list-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast("CSV file exported");
}

// Navigation and delegated list actions.
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
$("grocery-items").addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-empty-add]"); if (!button) return;
  if (button.hasAttribute("data-empty-add")) return openItem();
  const { action, id } = button.dataset;
  if (action === "toggle") { const item = items.find(entry => entry.id === id); if (item) { item.bought = !item.bought; persist(); render(); toast(item.bought ? "Marked as purchased" : "Moved back to to-buy list"); } }
  if (action === "edit") { const item = items.find(entry => entry.id === id); if (item) openItem(item); }
  if (action === "delete") deleteItem(id);
});
$("item-unit").addEventListener("change", updatePriceFields);
["item-quantity", "item-price"].forEach(id => $(id).addEventListener("input", updatePreview));
$("item-form").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("item-id").value;
  const item = { id: id || makeId(), name: $("item-name").value.trim(), category: $("item-category").value, unit: $("item-unit").value, quantity: Number($("item-quantity").value), price: Number($("item-price").value), bought: $("item-bought").checked };
  if (!item.name || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.price) || item.price < 0) { toast("Please enter a valid name, quantity, and price."); return; }
  const index = items.findIndex(entry => entry.id === id);
  if (index >= 0) items[index] = item; else items.push(item);
  persist(); $("item-dialog").close(); render(); toast(index >= 0 ? "Item updated" : "Item added to your list");
});
$("edit-budget").addEventListener("click", () => { $("budget-input").value = budget || ""; $("budget-dialog").showModal(); });
$("budget-form").addEventListener("submit", event => { event.preventDefault(); budget = Math.max(0, Number($("budget-input").value) || 0); persist(); $("budget-dialog").close(); render(); toast("Budget saved"); });
["open-add", "list-add"].forEach(id => $(id).addEventListener("click", () => openItem()));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $(button.dataset.close).close()));
["search-items", "filter-category", "filter-status"].forEach(id => $(id).addEventListener(id === "search-items" ? "input" : "change", render));
$("export-csv").addEventListener("click", exportCSV);
const saveButton = document.createElement("button"); saveButton.className = "secondary-btn save-trip-btn"; saveButton.textContent = "Save completed trip"; saveButton.addEventListener("click", saveTrip); $("list-view").querySelector(".list-total").appendChild(saveButton);
$("date-label").textContent = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

// Install prompt is available in supported Chromium-based browsers after HTTPS deployment.
window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installPrompt = event; $("install-app").hidden = false; });
$("install-app").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("install-app").hidden = true;
});
window.addEventListener("appinstalled", () => { $("install-app").hidden = true; toast("GroceryWise installed successfully"); });

populateCategories();
render();
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => toast("Offline mode could not be enabled in this browser.")));
}
