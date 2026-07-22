const DEFAULT_DATA = {
  products: [
    { sku: "zsj-06-a", name: "紫水晶", category: "主珠", size: "6mm", grade: "A级", unit: "颗", cost: 4.5, price: 8, warning: 30, aliases: "紫晶 小紫", stone: "purple" },
    { sku: "zsj-08-a", name: "紫水晶", category: "主珠", size: "8mm", grade: "A级", unit: "颗", cost: 7, price: 12, warning: 30, aliases: "紫晶", stone: "purple" },
    { sku: "zsj-10-a", name: "紫水晶", category: "主珠", size: "10mm", grade: "A级", unit: "颗", cost: 11, price: 18, warning: 20, aliases: "紫晶 大珠", stone: "purple" },
    { sku: "bsj-08-a", name: "白水晶", category: "主珠", size: "8mm", grade: "A级", unit: "颗", cost: 3.5, price: 7, warning: 40, aliases: "白晶", stone: "clear" },
    { sku: "ygs-08-jx", name: "月光石", category: "主珠", size: "8mm", grade: "精选", unit: "颗", cost: 12, price: 22, warning: 20, aliases: "月光 蓝月光", stone: "moon" },
    { sku: "hlb-06-a", name: "海蓝宝", category: "配珠", size: "6mm", grade: "A级", unit: "颗", cost: 5, price: 10, warning: 25, aliases: "海蓝宝", stone: "blue" },
    { sku: "ygz-03-bz", name: "银隔珠", category: "隔珠", size: "3mm", grade: "标准", unit: "颗", cost: 1.2, price: 3, warning: 50, aliases: "银珠 隔片", stone: "silver" },
  ],
  trayStock: [
    { tray: "01", sku: "zsj-06-a", quantity: 60, note: "左侧第一格" },
    { tray: "01", sku: "zsj-08-a", quantity: 50, note: "中间格" },
    { tray: "01", sku: "zsj-10-a", quantity: 20, note: "右侧格" },
    { tray: "02", sku: "zsj-08-a", quantity: 40, note: "补充托盘" },
    { tray: "02", sku: "bsj-08-a", quantity: 80, note: "右侧" },
    { tray: "03", sku: "ygs-08-jx", quantity: 36, note: "月光石" },
    { tray: "04", sku: "hlb-06-a", quantity: 50, note: "配珠区" },
    { tray: "05", sku: "ygz-03-bz", quantity: 200, note: "配件区" },
  ],
  orders: [],
};

const STORAGE_KEY = "crystal-store-os-demo-v4";
const clone = value => JSON.parse(JSON.stringify(value));
const money = value => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let state = loadState();
let activeProductFilter = "all";
let toastTimer;

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(DEFAULT_DATA); }
  catch { return clone(DEFAULT_DATA); }
}

function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function productBySku(sku) { return state.products.find(product => product.sku === sku); }
function totalStock(sku) { return state.trayStock.filter(row => row.sku === sku).reduce((sum, row) => sum + Number(row.quantity), 0); }
function traysForSku(sku) { return state.trayStock.filter(row => row.sku === sku); }
function trayCodes() { return [...new Set(state.trayStock.map(row => row.tray))].sort(); }

function showToast(message) {
  clearTimeout(toastTimer);
  const toast = $("#adminToast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function switchPage(pageId, title) {
  $$(".admin-page").forEach(page => page.classList.toggle("active", page.id === pageId));
  $$(".side-nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === pageId));
  $("#pageTitle").textContent = title;
  $("#breadcrumbTitle").textContent = title;
  if (pageId === "productsPage") renderProducts();
  if (pageId === "traysPage") renderTrays();
  if (pageId === "ordersPage") renderOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard() {
  const products = state.products.map(product => ({ ...product, total: totalStock(product.sku) }));
  const low = products.filter(product => product.total <= product.warning);
  const inventoryValue = products.reduce((sum, product) => sum + product.total * product.cost, 0);
  $("#dashboardKpis").innerHTML = [
    ["SKU 商品", products.length, "每种规格独立管理", "SKU"],
    ["在用托盘", trayCodes().length, `${state.trayStock.length} 条托盘库存记录`, "T"],
    ["库存预警", low.length, low.length ? "需要关注补货" : "当前库存健康", "!"],
    ["库存成本", money(inventoryValue), `${state.orders.length} 笔演示订单`, "¥"],
  ].map(([label, value, note, icon]) => `<article class="kpi-card"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon}</span></div><strong>${value}</strong><small>${note}</small></article>`).join("");

  const sorted = [...products].sort((a, b) => (a.total / Math.max(1, a.warning)) - (b.total / Math.max(1, b.warning))).slice(0, 5);
  $("#dashboardStock").innerHTML = sorted.map(product => {
    const percent = Math.min(100, Math.round(product.total / Math.max(1, product.warning * 3) * 100));
    const isLow = product.total <= product.warning;
    return `<div class="stock-row"><div><strong>${product.name} · ${product.size}</strong><small>${product.sku}</small></div><div class="stock-bar"><span class="${isLow ? "low" : ""}" style="width:${percent}%"></span></div><div class="stock-number">${product.total}${product.unit} / 预警${product.warning}</div><span class="status-badge">${isLow ? "需关注" : "正常"}</span></div>`;
  }).join("");

  $("#dashboardTrays").innerHTML = trayCodes().map(code => {
    const rows = state.trayStock.filter(row => row.tray === code);
    const names = rows.map(row => `${productBySku(row.sku)?.name}${productBySku(row.sku)?.size}`).join("、");
    return `<div class="tray-tile"><strong>T${code}</strong><small>${rows.length}个SKU<br>${names}</small></div>`;
  }).join("");

  $("#dashboardOrders").innerHTML = state.orders.slice(0, 4).map(order => `<div class="recent-order"><strong>${order.id}</strong><span>${formatDate(order.createdAt)}</span><strong>${money(order.total)}</strong><span class="status-badge">${order.status}</span></div>`).join("") || `<div class="empty-table">暂无成交记录，可先到手机端完成一笔报价。</div>`;
  $("#productNavCount").textContent = state.products.length;
  $("#trayNavCount").textContent = trayCodes().length;
}

function renderProducts() {
  const query = $("#productSearch").value.trim().toLowerCase();
  const products = state.products.filter(product => {
    const searchable = [product.name, product.sku, product.aliases, product.size, product.grade].join(" ").toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const total = totalStock(product.sku);
    const matchesFilter = activeProductFilter === "all" || (activeProductFilter === "low" ? total <= product.warning : product.category === activeProductFilter);
    return matchesQuery && matchesFilter;
  });
  $("#productTableBody").innerHTML = products.map(product => {
    const total = totalStock(product.sku);
    const low = total <= product.warning;
    const trays = traysForSku(product.sku);
    return `<tr>
      <td><div class="product-cell"><span class="mini-stone"></span><div><strong>${product.name} · ${product.size}</strong><small>${product.grade} · ${product.aliases || "暂无别名"}</small></div></div></td>
      <td><span class="sku-code">${product.sku}</span></td><td>${product.category}</td><td>${money(product.cost)}</td><td><strong>${money(product.price)}</strong>/${product.unit}</td>
      <td class="${low ? "low-text" : ""}">${total}${product.unit}</td><td><div class="tray-tags">${trays.map(row => `<span>T${row.tray} · ${row.quantity}</span>`).join("") || "未分配"}</div></td>
      <td><span class="status-badge">在售</span></td><td><button class="row-action" data-edit-sku="${product.sku}">编辑</button></td>
    </tr>`;
  }).join("") || `<tr><td class="empty-table" colspan="9">没有找到匹配商品</td></tr>`;
  $$('[data-edit-sku]').forEach(button => button.addEventListener("click", () => openProductModal(button.dataset.editSku)));
}

function renderTrays() {
  $("#traySummaryCards").innerHTML = trayCodes().map(code => {
    const rows = state.trayStock.filter(row => row.tray === code);
    const total = rows.reduce((sum, row) => sum + Number(row.quantity), 0);
    return `<article class="tray-card"><strong>T${code}</strong><span>${rows.length} 个SKU · 数量合计 ${total}<br>${rows.map(row => productBySku(row.sku)?.name).join("、")}</span></article>`;
  }).join("");
  $("#trayTableBody").innerHTML = state.trayStock.map((row, index) => {
    const product = productBySku(row.sku);
    return `<tr><td><strong>T${row.tray}</strong></td><td>${row.note || "未填写"}<br><small>${product.name} · ${product.size} · ${product.grade}</small></td><td><span class="sku-code">${row.sku}</span></td><td>${row.quantity}${product.unit}</td><td>${totalStock(row.sku)}${product.unit}</td><td>${money(product.price)}/${product.unit}</td><td><button class="row-action" data-stock-index="${index}">调整库存</button></td></tr>`;
  }).join("");
  $$('[data-stock-index]').forEach(button => button.addEventListener("click", () => adjustStock(Number(button.dataset.stockIndex))));
}

function adjustStock(index) {
  const row = state.trayStock[index];
  const product = productBySku(row.sku);
  const value = window.prompt(`请输入 T${row.tray} 中 ${product.name}${product.size} 的实际库存`, row.quantity);
  if (value === null) return;
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0) return showToast("请输入有效库存数量");
  row.quantity = quantity;
  persist();
  renderAll();
  showToast(`T${row.tray} 库存已更新`);
}

function renderOrders() {
  $("#orderTableHint").textContent = `${state.orders.length} 笔成交记录`;
  $("#orderTableBody").innerHTML = state.orders.map(order => {
    const detail = order.lines.map(line => { const product = productBySku(line.sku); return `T${line.tray} ${product?.name || line.sku}${product?.size || ""} × ${line.quantity}`; }).join("；");
    return `<tr><td><strong>${order.id}</strong></td><td>${formatDate(order.createdAt)}</td><td>${detail}</td><td>${money(order.material)}</td><td>${money(order.labor)}</td><td>${money(order.discount)}</td><td><strong>${money(order.total)}</strong></td><td><span class="status-badge">${order.status}</span></td></tr>`;
  }).join("") || `<tr><td class="empty-table" colspan="8">暂无成交记录；请在手机端完成一笔报价。</td></tr>`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function openProductModal(sku = "") {
  const product = sku ? productBySku(sku) : null;
  $("#editingSku").value = sku;
  $("#productModalTitle").textContent = product ? "编辑商品" : "新增商品";
  $("#editName").value = product?.name || "";
  $("#editSku").value = product?.sku || "";
  $("#editSku").disabled = Boolean(product);
  $("#editCategory").value = product?.category || "主珠";
  $("#editSize").value = product?.size || "";
  $("#editGrade").value = product?.grade || "A级";
  $("#editUnit").value = product?.unit || "颗";
  $("#editCost").value = product?.cost ?? 0;
  $("#editPrice").value = product?.price ?? 0;
  $("#editWarning").value = product?.warning ?? 0;
  $("#editAliases").value = product?.aliases || "";
  $("#modalBackdrop").classList.remove("hidden");
  $("#productModal").classList.remove("hidden");
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
  $("#productModal").classList.add("hidden");
}

function saveProduct(event) {
  event.preventDefault();
  const originalSku = $("#editingSku").value;
  const sku = $("#editSku").value.trim().toLowerCase();
  if (!originalSku && state.products.some(product => product.sku === sku)) return showToast("SKU 已存在");
  const data = {
    sku,
    name: $("#editName").value.trim(),
    category: $("#editCategory").value,
    size: $("#editSize").value.trim(),
    grade: $("#editGrade").value.trim(),
    unit: $("#editUnit").value,
    cost: Number($("#editCost").value) || 0,
    price: Number($("#editPrice").value) || 0,
    warning: Number($("#editWarning").value) || 0,
    aliases: $("#editAliases").value.trim(),
    stone: originalSku ? productBySku(originalSku).stone : "purple",
  };
  if (originalSku) Object.assign(productBySku(originalSku), data);
  else state.products.push(data);
  persist();
  closeModal();
  renderAll();
  showToast(originalSku ? "商品资料已更新，手机端价格同步" : "商品已新增");
}

function handleExcelPreview(file) {
  if (!file) return;
  $("#importPreview").className = "";
  $("#importPreview").innerHTML = `<p class="kicker">${file.name}</p><h3>文件已读取到演示预览</h3><div class="preview-stats"><div><strong>${state.products.length}</strong><span>SKU商品</span></div><div><strong>${state.trayStock.length}</strong><span>托盘库存记录</span></div><div><strong>0</strong><span>示例错误</span></div></div><div class="preview-success">✓ 字段结构正常<br>正式版本会逐行解析Excel，并在确认后才写入系统。</div>`;
}

function renderAll() {
  renderDashboard();
  renderProducts();
  renderTrays();
  renderOrders();
}

$$('.side-nav-item').forEach(button => button.addEventListener("click", () => switchPage(button.dataset.page, button.dataset.title)));
$$('[data-jump]').forEach(button => button.addEventListener("click", () => {
  const nav = $(`.side-nav-item[data-page="${button.dataset.jump}"]`);
  switchPage(button.dataset.jump, nav.dataset.title);
}));
$$('[data-new-product]').forEach(button => button.addEventListener("click", () => openProductModal()));
$$('[data-close-modal]').forEach(button => button.addEventListener("click", closeModal));
$("#modalBackdrop").addEventListener("click", closeModal);
$("#productForm").addEventListener("submit", saveProduct);
$("#productSearch").addEventListener("input", renderProducts);
$$('[data-product-filter]').forEach(button => button.addEventListener("click", () => {
  activeProductFilter = button.dataset.productFilter;
  $$('[data-product-filter]').forEach(item => item.classList.toggle("active", item === button));
  renderProducts();
}));
$("#globalSearch").addEventListener("input", event => {
  $("#productSearch").value = event.target.value;
  switchPage("productsPage", "SKU 商品");
});
$("#excelFile").addEventListener("change", event => handleExcelPreview(event.target.files[0]));
$("#addTrayButton").addEventListener("click", () => showToast("Demo 中请通过 Excel 模板批量新增托盘"));
$("#resetAdminDemo").addEventListener("click", () => {
  if (!window.confirm("恢复初始商品、库存和销售记录吗？")) return;
  state = clone(DEFAULT_DATA);
  persist();
  renderAll();
  showToast("演示数据已重置");
});

window.addEventListener("storage", event => {
  if (event.key !== STORAGE_KEY) return;
  state = loadState();
  renderAll();
  showToast("手机端数据已同步");
});

renderAll();
