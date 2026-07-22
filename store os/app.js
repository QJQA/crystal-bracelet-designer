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
const money = value => `¥${Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
const clone = value => JSON.parse(JSON.stringify(value));

let state = loadState();
let quote = [];
let selected = null;
let activeTray = null;
let activeSearchMode = "tray";
let discountMode = "amount";
let discountRate = 0;
let recentTrays = ["01", "02", "03"];
let toastTimer;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || clone(DEFAULT_DATA);
  } catch {
    return clone(DEFAULT_DATA);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTray(value) {
  const trimmed = String(value || "").trim().toUpperCase().replace(/^T/, "");
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(2, "0");
  return trimmed;
}

function productBySku(sku) {
  return state.products.find(product => product.sku === sku);
}

function trayRows(trayCode) {
  return state.trayStock.filter(row => row.tray === trayCode);
}

function totalStock(sku) {
  return state.trayStock.filter(row => row.sku === sku).reduce((sum, row) => sum + Number(row.quantity), 0);
}

function trayStock(tray, sku) {
  return state.trayStock.find(row => row.tray === tray && row.sku === sku)?.quantity || 0;
}

function stoneThumb(product) {
  return `<span class="stone-thumb stone-${product.stone || "purple"}" aria-hidden="true"></span>`;
}

function selectedSize(filterId) {
  return $(`#${filterId} .size-filter-chip.active`)?.dataset.size || "";
}

function setSelectedSize(filterId, size) {
  $$(`#${filterId} .size-filter-chip`).forEach(button => {
    const active = button.dataset.size === size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderSizeOptions() {
  const sizes = [...new Set(state.products.map(product => product.size))]
    .sort((a, b) => (Number.parseFloat(a) || 0) - (Number.parseFloat(b) || 0));
  ["traySizeFilter", "productSizeFilter"].forEach(id => {
    const current = selectedSize(id);
    const options = $(`#${id} .size-filter-options`);
    options.innerHTML = ["", ...sizes].map(size => {
      const label = size || "全部";
      const active = size === current || (!current && !size);
      return `<button type="button" class="size-filter-chip${active ? " active" : ""}" data-size="${size}" aria-pressed="${active}">${label}</button>`;
    }).join("");
  });
}

function renderRecentTrays() {
  $("#recentTrays").innerHTML = recentTrays.map(code => `<button class="tray-chip" data-tray="${code}">T${code}</button>`).join("");
  $$(".tray-chip").forEach(button => button.addEventListener("click", () => showTray(button.dataset.tray)));
}

function showTray(rawCode, { scroll = true } = {}) {
  const code = normalizeTray(rawCode);
  const allRows = trayRows(code);
  const size = selectedSize("traySizeFilter");
  const rows = allRows.filter(row => !size || productBySku(row.sku)?.size === size);
  const hint = $("#searchHint");
  if (!allRows.length) {
    hint.textContent = `没有找到 ${code || "该"} 号托盘，请检查编号或按商品搜索。`;
    hint.style.color = "var(--danger)";
    $("#trayResult").classList.add("hidden");
    $("#emptyGuide").classList.remove("hidden");
    return;
  }

  activeTray = code;
  $("#trayCodeInput").value = code;
  hint.textContent = rows.length
    ? `已定位托盘${size ? `，当前筛选 ${size}` : ""}，请选择商品。`
    : `${code}号托盘内没有 ${size} 商品，可切换其他尺寸。`;
  hint.style.color = rows.length ? "var(--green)" : "var(--amber)";
  $("#trayResultName").textContent = `${code}号托盘`;
  $("#trayResultCount").textContent = size ? `${rows.length} 个 ${size} 规格` : `${rows.length} 个规格`;
  $("#trayProducts").innerHTML = rows.map(row => {
    const product = productBySku(row.sku);
    return `
      <button class="product-card" data-sku="${product.sku}" data-tray="${code}">
        ${stoneThumb(product)}
        <span class="product-info"><strong>${product.name} · ${product.size}</strong><span>${product.grade} · ${row.note || product.sku}</span></span>
        <span class="product-price"><strong>${money(product.price)}</strong><span>库存 ${row.quantity}${product.unit}</span></span>
      </button>`;
  }).join("") || `<div class="no-data compact-empty">该托盘暂无符合尺寸的商品</div>`;
  $("#trayResult").classList.remove("hidden");
  $("#productResult").classList.add("hidden");
  $("#emptyGuide").classList.add("hidden");
  recentTrays = [code, ...recentTrays.filter(item => item !== code)].slice(0, 4);
  renderRecentTrays();
  $$("#trayProducts .product-card").forEach(button => button.addEventListener("click", () => openQuantity(button.dataset.tray, button.dataset.sku)));
  if (scroll) setTimeout(() => $("#trayResult").scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

function openQuantity(tray, sku) {
  const product = productBySku(sku);
  selected = { tray, sku };
  $("#selectedProductHero").innerHTML = `
    <p class="step-label">T${tray} · ${sku}</p>
    <h2 id="quantityTitle">${product.name} · ${product.size}</h2>
    <p>${product.grade} · 来源 ${tray}号托盘 · 当前库存 ${trayStock(tray, sku)}${product.unit}</p>
    <span class="price">${money(product.price)} / ${product.unit}</span>`;
  $("#quantityInput").value = product.unit === "克" ? "1.0" : "1";
  updateQuantityPreview();
  openSheet("quantitySheet");
  setTimeout(() => $("#quantityInput").select(), 120);
}

function updateQuantityPreview() {
  if (!selected) return;
  const product = productBySku(selected.sku);
  const quantity = Math.max(0, Number($("#quantityInput").value) || 0);
  const available = trayStock(selected.tray, selected.sku);
  $("#lineSubtotal").textContent = money(product.price * quantity);
  const hint = $("#quantityStockHint");
  hint.textContent = quantity > available
    ? `数量超过该托盘库存 ${available}${product.unit}，成交时需要再次确认。`
    : `成交后将从 ${selected.tray}号托盘扣减 ${quantity}${product.unit}。`;
  hint.classList.toggle("warning", quantity > available);
}

function addSelectedToQuote() {
  if (!selected) return;
  const quantity = Number($("#quantityInput").value);
  if (!quantity || quantity <= 0) return showToast("请输入有效数量");
  const product = productBySku(selected.sku);
  const existing = quote.find(line => line.tray === selected.tray && line.sku === selected.sku);
  if (existing) existing.quantity += quantity;
  else quote.push({ tray: selected.tray, sku: selected.sku, quantity, price: product.price });
  closeSheets();
  renderQuote();
  showToast(`${product.name} ${product.size} 已加入报价`);
  setTimeout(() => $(activeSearchMode === "tray" ? "#trayCodeInput" : "#productSearchInput").focus(), 80);
}

function quoteMaterialTotal() {
  return quote.reduce((sum, line) => sum + line.quantity * line.price, 0);
}

function currentFees() {
  const material = quoteMaterialTotal();
  const rawDiscount = discountMode === "rate"
    ? material * discountRate
    : Math.max(0, Number($("#discountFee")?.value) || 0);
  return {
    labor: 0,
    discount: Number(Math.min(material, rawDiscount).toFixed(2)),
  };
}

function finalTotal() {
  const fees = currentFees();
  return Math.max(0, quoteMaterialTotal() - fees.discount);
}

function renderQuote() {
  const total = quoteMaterialTotal();
  $("#heroTotal").textContent = money(total);
  $("#heroItemCount").textContent = `${quote.length} 种商品`;
  $("#cartCount").textContent = quote.length;
  $("#cartTotal").textContent = money(total);
  $("#cartBar").classList.toggle("hidden", !quote.length);

  $("#quoteLines").innerHTML = quote.map((line, index) => {
    const product = productBySku(line.sku);
    return `<div class="quote-line">
      <div><strong>${product.name} · ${product.size}</strong><span>T${line.tray} · ${line.quantity}${product.unit} × ${money(line.price)}</span></div>
      <strong class="line-money">${money(line.quantity * line.price)}</strong>
      <button class="remove-line" data-index="${index}" aria-label="删除">×</button>
    </div>`;
  }).join("") || `<div class="no-data">报价单还是空的</div>`;
  $$(".remove-line").forEach(button => button.addEventListener("click", () => {
    quote.splice(Number(button.dataset.index), 1);
    renderQuote();
  }));
  renderTotals();
}

function renderTotals() {
  const fees = currentFees();
  $("#materialTotal").textContent = money(quoteMaterialTotal());
  $("#discountTotal").textContent = `−${money(fees.discount)}`;
  $("#discountRateAmount").textContent = money(discountMode === "rate" ? fees.discount : quoteMaterialTotal() * discountRate);
  $("#discountSummaryLabel").textContent = discountMode === "rate" && discountRate
    ? `优惠（${Math.round(discountRate * 100)}%）`
    : "优惠";
  $("#grandTotal").textContent = money(finalTotal());
}

function setDiscountMode(mode) {
  discountMode = mode;
  $$(".discount-mode-tab").forEach(button => {
    const active = button.dataset.discountMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $("#discountAmountPanel").classList.toggle("hidden", mode !== "amount");
  $("#discountRatePanel").classList.toggle("hidden", mode !== "rate");
  renderTotals();
}

function setDiscountRate(rate) {
  discountRate = rate;
  $$(".discount-rate-chip").forEach(button => {
    const active = Number(button.dataset.rate) === rate;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderTotals();
}

function resetDiscount() {
  $("#discountFee").value = 0;
  setDiscountRate(0);
  setDiscountMode("amount");
}

function confirmSale() {
  if (!quote.length) return showToast("请先添加商品");
  const shortages = quote.filter(line => line.quantity > trayStock(line.tray, line.sku));
  if (shortages.length && !window.confirm("部分商品超过账面库存，仍然确认成交吗？")) return;

  quote.forEach(line => {
    const row = state.trayStock.find(item => item.tray === line.tray && item.sku === line.sku);
    if (row) row.quantity = Number((row.quantity - line.quantity).toFixed(2));
  });
  const fees = currentFees();
  const now = new Date();
  state.orders.unshift({
    id: `SO-${String(now.getTime()).slice(-6)}`,
    createdAt: now.toISOString(),
    lines: clone(quote),
    material: quoteMaterialTotal(),
    labor: 0,
    discount: fees.discount,
    discountType: discountMode,
    discountRate: discountMode === "rate" ? discountRate : 0,
    total: finalTotal(),
    status: "已成交",
  });
  persist();
  quote = [];
  resetDiscount();
  closeSheets();
  renderAll();
  showToast("成交成功，来源托盘库存已扣减");
}

function saveQuote() {
  if (!quote.length) return showToast("请先添加商品");
  showToast("报价已保存（Demo 不扣库存）");
  closeSheets();
}

function renderInventory(filter = "all") {
  const items = state.products.map(product => ({ ...product, total: totalStock(product.sku), trays: state.trayStock.filter(row => row.sku === product.sku) }));
  const lowCount = items.filter(item => item.total <= item.warning).length;
  $("#inventoryMetrics").innerHTML = `
    <div class="metric-card"><span>SKU 数量</span><strong>${items.length}</strong></div>
    <div class="metric-card"><span>库存偏低</span><strong>${lowCount}</strong></div>`;
  const filtered = items.filter(item => filter === "all" || (filter === "low" ? item.total <= item.warning : item.name.includes(filter)));
  $("#inventoryList").innerHTML = filtered.map(item => {
    const low = item.total <= item.warning;
    return `<article class="inventory-card">
      <div class="inventory-top">
        <div><h3>${item.name} · ${item.size}</h3><p>${item.grade} · ${item.sku} · ${money(item.price)}/${item.unit}</p></div>
        <span class="stock-pill ${low ? "low" : ""}">${low ? "库存偏低 · " : "库存 · "}${item.total}${item.unit}</span>
      </div>
      <div class="tray-breakdown">${item.trays.map(row => `<span>T${row.tray}：${row.quantity}${item.unit}</span>`).join("")}</div>
    </article>`;
  }).join("") || `<div class="no-data">当前筛选下没有商品</div>`;
}

function renderOrders() {
  $("#orderList").innerHTML = state.orders.map(order => {
    const date = new Date(order.createdAt);
    const detail = order.lines.map(line => {
      const product = productBySku(line.sku);
      return `T${line.tray} · ${product.name}${product.size} × ${line.quantity}${product.unit}`;
    }).join("<br>");
    return `<article class="order-card">
      <div class="order-head"><strong>${order.id}</strong><span>${date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>
      <div class="order-items">${detail}</div>
      <div class="order-total"><span>${order.status}</span><strong>${money(order.total)}</strong></div>
    </article>`;
  }).join("") || `<div class="no-data"><h3>还没有成交记录</h3><p>完成第一笔报价后，这里会显示销售和库存变化。</p></div>`;
}

function renderProductSearchResults() {
  const term = $("#productSearchInput").value.trim().toLowerCase();
  const size = selectedSize("productSizeFilter");
  const products = state.products.filter(product => {
    const matchesTerm = !term || [product.name, product.size, product.grade, product.sku, product.aliases].join(" ").toLowerCase().includes(term);
    return matchesTerm && (!size || product.size === size);
  });
  const resultRows = products.flatMap(product => {
    const rows = state.trayStock.filter(row => row.sku === product.sku);
    return rows.map(row => ({ product, row }));
  });
  $("#productResultCount").textContent = `${resultRows.length} 个可售位置`;
  $("#productSearchResults").innerHTML = resultRows.map(({ product, row }) => `
    <button class="product-card" data-tray="${row.tray}" data-sku="${product.sku}">
      ${stoneThumb(product)}
      <span class="product-info"><strong>${product.name} · ${product.size}</strong><span>${product.grade} · T${row.tray} · 库存 ${row.quantity}${product.unit}</span></span>
      <span class="product-price"><strong>${money(product.price)}</strong><span>${product.sku}</span></span>
    </button>`).join("") || `<div class="no-data compact-empty">没有找到匹配商品，请更换关键词或尺寸</div>`;
  $("#productResult").classList.remove("hidden");
  $("#trayResult").classList.add("hidden");
  $("#emptyGuide").classList.add("hidden");
  $$("#productSearchResults .product-card").forEach(button => button.addEventListener("click", () => openQuantity(button.dataset.tray, button.dataset.sku)));
}

function switchSearchMode(mode) {
  activeSearchMode = mode;
  $$(".search-mode-tab").forEach(tab => {
    const active = tab.dataset.searchMode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  $("#traySearchPanel").classList.toggle("hidden", mode !== "tray");
  $("#productSearchPanel").classList.toggle("hidden", mode !== "product");
  $("#trayResult").classList.toggle("hidden", mode !== "tray" || !activeTray);
  $("#productResult").classList.toggle("hidden", mode !== "product");
  $("#emptyGuide").classList.toggle("hidden", mode === "product" || Boolean(activeTray));

  if (mode === "product") {
    renderProductSearchResults();
    setTimeout(() => $("#productSearchInput").focus(), 80);
  } else {
    $("#emptyGuideTitle").textContent = "先从托盘编号开始";
    $("#emptyGuideCopy").textContent = "查到商品后选择规格和数量，系统会自动带出价格。";
    if (activeTray) showTray(activeTray, { scroll: false });
    else setTimeout(() => $("#trayCodeInput").focus(), 80);
  }
}

function openSheet(id) {
  $("#sheetBackdrop").classList.remove("hidden");
  $$(".bottom-sheet").forEach(sheet => sheet.classList.add("hidden"));
  $(`#${id}`).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeSheets() {
  $("#sheetBackdrop").classList.add("hidden");
  $$(".bottom-sheet").forEach(sheet => sheet.classList.add("hidden"));
  document.body.style.overflow = "";
}

function switchView(viewId) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === viewId));
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === viewId));
  $("#cartBar").classList.toggle("hidden", viewId !== "quoteView" || !quote.length);
  if (viewId === "inventoryView") renderInventory($(".filter-chip.active")?.dataset.filter || "all");
  if (viewId === "ordersView") renderOrders();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  clearTimeout(toastTimer);
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2300);
}

function renderAll() {
  renderSizeOptions();
  renderRecentTrays();
  renderQuote();
  renderInventory();
  renderOrders();
  if (activeSearchMode === "product") renderProductSearchResults();
  else if (activeTray) showTray(activeTray, { scroll: false });
}

$("#traySearchForm").addEventListener("submit", event => {
  event.preventDefault();
  showTray($("#trayCodeInput").value);
});
$("#traySizeFilter").addEventListener("click", event => {
  const button = event.target.closest(".size-filter-chip");
  if (!button) return;
  setSelectedSize("traySizeFilter", button.dataset.size);
  if (activeTray) showTray(activeTray, { scroll: false });
});
$("#productSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  renderProductSearchResults();
});
$("#productSearchInput").addEventListener("input", renderProductSearchResults);
$("#productSizeFilter").addEventListener("click", event => {
  const button = event.target.closest(".size-filter-chip");
  if (!button) return;
  setSelectedSize("productSizeFilter", button.dataset.size);
  renderProductSearchResults();
});
$$(".search-mode-tab").forEach(button => button.addEventListener("click", () => switchSearchMode(button.dataset.searchMode)));
$("#clearProductSearch").addEventListener("click", () => {
  $("#productSearchInput").value = "";
  setSelectedSize("productSizeFilter", "");
  renderProductSearchResults();
  $("#productSearchInput").focus();
});
$("#clearTray").addEventListener("click", () => {
  activeTray = null;
  $("#trayResult").classList.add("hidden");
  $("#emptyGuide").classList.remove("hidden");
  $("#trayCodeInput").value = "";
  $("#searchHint").textContent = "输入托盘上可见的编号，不需要记商品 SKU。";
  $("#searchHint").style.color = "";
  $("#trayCodeInput").focus();
});
$("#decreaseQty").addEventListener("click", () => {
  $("#quantityInput").value = Math.max(1, (Number($("#quantityInput").value) || 1) - 1);
  updateQuantityPreview();
});
$("#increaseQty").addEventListener("click", () => {
  $("#quantityInput").value = (Number($("#quantityInput").value) || 0) + 1;
  updateQuantityPreview();
});
$("#quantityInput").addEventListener("input", updateQuantityPreview);
$("#addToQuote").addEventListener("click", addSelectedToQuote);
$("#cartBar").addEventListener("click", () => { renderQuote(); openSheet("quoteSheet"); });
$("#discountFee").addEventListener("input", renderTotals);
$$(".discount-mode-tab").forEach(button => button.addEventListener("click", () => setDiscountMode(button.dataset.discountMode)));
$$(".discount-rate-chip").forEach(button => button.addEventListener("click", () => setDiscountRate(Number(button.dataset.rate))));
$("#clearQuote").addEventListener("click", () => { quote = []; resetDiscount(); renderQuote(); closeSheets(); showToast("报价单已清空"); });
$("#saveQuote").addEventListener("click", saveQuote);
$("#confirmSale").addEventListener("click", confirmSale);
$("#sheetBackdrop").addEventListener("click", closeSheets);
$$('[data-close-sheet]').forEach(button => button.addEventListener("click", closeSheets));
$$('.nav-item').forEach(button => button.addEventListener("click", () => switchView(button.dataset.view)));
$$('.filter-chip').forEach(button => button.addEventListener("click", () => {
  $$('.filter-chip').forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  renderInventory(button.dataset.filter);
}));
$("#resetDemo").addEventListener("click", () => {
  if (!window.confirm("要恢复初始商品、库存和销售记录吗？")) return;
  state = clone(DEFAULT_DATA);
  quote = [];
  activeTray = null;
  persist();
  $("#trayResult").classList.add("hidden");
  $("#emptyGuide").classList.remove("hidden");
  renderAll();
  showToast("演示数据已重置");
});

renderAll();
