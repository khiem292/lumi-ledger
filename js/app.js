import { allTransactions, saveTransaction, removeTransaction, saveMany } from './db.js';

const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Ăn uống', emoji: '🍜', color: '#F3A47C' },
  { id: 'shopping', name: 'Mua sắm', emoji: '🛍️', color: '#A19AE5' },
  { id: 'travel', name: 'Đi lại', emoji: '🛵', color: '#77BBA3' },
  { id: 'bills', name: 'Hóa đơn', emoji: '🧾', color: '#E6BC75' },
  { id: 'home', name: 'Nhà cửa', emoji: '🏠', color: '#8EC0D8' },
  { id: 'health', name: 'Sức khỏe', emoji: '💊', color: '#DC9FAB' },
  { id: 'fun', name: 'Giải trí', emoji: '🎮', color: '#A5C58B' },
  { id: 'other-expense', name: 'Khác', emoji: '✨', color: '#B0BCB3' }
];
const INCOME_CATEGORIES = [
  { id: 'salary', name: 'Tiền lương', emoji: '💼', color: '#78BBA0' },
  { id: 'gift', name: 'Quà tặng', emoji: '🎁', color: '#E9B287' },
  { id: 'bonus', name: 'Thưởng', emoji: '🏆', color: '#E6C579' },
  { id: 'business', name: 'Kinh doanh', emoji: '🏪', color: '#9CBBDF' },
  { id: 'other-income', name: 'Khác', emoji: '✨', color: '#AEBDB2' }
];
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
const $ = selector => document.querySelector(selector);
const money = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} ₫`;
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const categoryOf = id => ALL_CATEGORIES.find(c => c.id === id) ?? { id, name: 'Khác', emoji: '✨', color:'#B0BCB3' };
const dateLong = ts => new Intl.DateTimeFormat('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(ts));
const dateDay = ts => new Intl.DateTimeFormat('vi-VN', { weekday:'long', day:'numeric', month:'numeric', year:'numeric' }).format(new Date(ts));
const formatLocalInput = value => {
  const d = new Date(value), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const formatDateInput = value => formatLocalInput(value).slice(0, 10);

let records = [];
let screen = 'home';
let feedMode = (() => { try { return localStorage.getItem('lumi-view') === 'grid' ? 'grid' : 'feed'; } catch { return 'feed'; } })();
let statsPeriod = 'month';
let customRange = null;
let editorId = null;
let detailId = null;
let editorKind = 'expense';
let editorCategory = 'food';
let newImage = null;
let processingImage = false;
let previewObjectUrl = null;
let feedUrls = [];
let detailUrl = null;
let toastTimer;

function setToast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3600);
}
function clearUrls(urls) { urls.forEach(url => URL.revokeObjectURL(url)); }
function imageSrc(blob, intoArray) {
  if (!(blob instanceof Blob)) return '';
  const url = URL.createObjectURL(blob);
  intoArray.push(url);
  return url;
}
function syncModalState() { document.body.classList.toggle('modal-open', !$('#editor-overlay').hidden || !$('#detail-overlay').hidden); }
function currentCategories() { return editorKind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES; }
function setKind(kind, resetCategory = true) {
  editorKind = kind;
  if (resetCategory || !currentCategories().some(c => c.id === editorCategory)) editorCategory = currentCategories()[0].id;
  document.querySelectorAll('[data-kind]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.kind === kind));
  renderCategoryOptions();
}
function renderCategoryOptions() {
  $('#category-options').innerHTML = currentCategories().map(cat => `<button class="category-choice ${editorCategory===cat.id?'is-active':''}" type="button" data-category="${cat.id}" aria-pressed="${editorCategory===cat.id}"><span class="cat-icon">${cat.emoji}</span><small>${cat.name}</small></button>`).join('');
}
function resetPreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
}
function updatePreview(blob) {
  resetPreview();
  if (blob instanceof Blob) {
    previewObjectUrl = URL.createObjectURL(blob);
    $('#photo-preview').innerHTML = `<img src="${previewObjectUrl}" alt="Ảnh giao dịch đã chọn">`;
  } else {
    $('#photo-preview').innerHTML = `<div class="photo-placeholder"><span class="photo-placeholder-icon">▧</span><strong>Thêm một bức ảnh</strong><small>Hóa đơn, chuyển khoản hay món đồ bạn thích</small></div>`;
  }
}
function showEditor(id = null) {
  closeDetail();
  const record = id ? records.find(r => r.id === id) : null;
  editorId = record?.id || null;
  newImage = null;
  processingImage = false;
  $('#save-button').disabled = false;
  $('#save-button').textContent = record ? 'Cập nhật giao dịch →' : 'Lưu giao dịch →';
  $('#editor-title').textContent = record ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch';
  $('#amount').value = record ? new Intl.NumberFormat('vi-VN').format(record.amount) : '';
  $('#transaction-date').value = formatLocalInput(record?.date ?? Date.now());
  $('#note').value = record?.note ?? '';
  $('#form-error').hidden = true;
  $('#camera-input').value = '';
  $('#gallery-input').value = '';
  editorKind = record?.kind ?? 'expense';
  editorCategory = record?.categoryId ?? 'food';
  setKind(editorKind, false);
  updatePreview(record?.image ?? null);
  $('#editor-overlay').hidden = false;
  syncModalState();
  $('#editor-close').focus();
}
function closeEditor() {
  $('#editor-overlay').hidden = true;
  newImage = null;
  resetPreview();
  syncModalState();
}
function showDetail(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;
  detailId = record.id;
  if (detailUrl) URL.revokeObjectURL(detailUrl);
  detailUrl = record.image instanceof Blob ? URL.createObjectURL(record.image) : null;
  const cat = categoryOf(record.categoryId);
  const prefix = record.kind === 'income' ? '+' : '−';
  $('#detail-content').innerHTML = `<div class="detail-image">${detailUrl?`<img alt="Ảnh giao dịch" src="${detailUrl}">`:''}</div><div class="detail-amount" style="color:${record.kind==='income'?'#367d52':'#bf6b56'}">${prefix}${money(record.amount)}</div><div class="detail-meta"><span>${cat.emoji} ${cat.name}</span><span>◷ ${dateLong(record.date)}</span><span>${record.kind==='income'?'Khoản thu':'Khoản chi'}</span></div>${record.note?`<div class="detail-note">${escapeHTML(record.note)}</div>`:''}`;
  $('#detail-overlay').hidden = false;
  syncModalState();
}
function closeDetail() {
  $('#detail-overlay').hidden = true;
  detailId = null;
  if (detailUrl) URL.revokeObjectURL(detailUrl);
  detailUrl = null;
  syncModalState();
}

async function shrinkImage(file) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) throw new Error('Vui lòng chọn một tệp hình ảnh.');
  if (file.size > 35 * 1024 * 1024) throw new Error('Ảnh vượt quá 35 MB. Hãy chọn ảnh nhỏ hơn.');
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Không đọc được ảnh. Hãy thử ảnh JPG hoặc PNG.'));
      image.src = blobUrl;
    });
    const makeBlob = (limit, quality) => new Promise((resolve, reject) => {
      const scale = Math.min(1, limit / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Không thể xử lý ảnh trên thiết bị này.')); return; }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        canvas.width = 0; canvas.height = 0;
        blob ? resolve(blob) : reject(new Error('Không thể nén ảnh.'));
      }, 'image/jpeg', quality);
    });
    const [image, thumb] = await Promise.all([makeBlob(1800, 0.8), makeBlob(540, 0.72)]);
    return { image, thumb };
  } finally { URL.revokeObjectURL(blobUrl); }
}
async function photoSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  processingImage = true;
  $('#save-button').disabled = true;
  $('#save-button').textContent = 'Đang tối ưu ảnh...';
  try {
    newImage = await shrinkImage(file);
    updatePreview(newImage.image);
    setToast('Đã chọn và nén ảnh thành công.');
  } catch (err) { setToast(err.message || 'Không thể chọn ảnh.'); }
  finally {
    processingImage = false;
    $('#save-button').disabled = false;
    $('#save-button').textContent = editorId ? 'Cập nhật giao dịch →' : 'Lưu giao dịch →';
    event.target.value = '';
  }
}
function parseMoney(text) {
  const raw = String(text).replace(/\D/g, '');
  return raw ? Number(raw) : NaN;
}
async function submitTransaction(event) {
  event.preventDefault();
  if (processingImage) return;
  const amount = parseMoney($('#amount').value);
  const date = new Date($('#transaction-date').value).getTime();
  const previous = editorId ? records.find(r => r.id === editorId) : null;
  const image = newImage?.image ?? previous?.image;
  const thumb = newImage?.thumb ?? previous?.thumb ?? image;
  let message = '';
  if (!image) message = 'Vui lòng chụp hoặc chọn ảnh trước khi lưu.';
  else if (!Number.isSafeInteger(amount) || amount <= 0) message = 'Số tiền phải là số nguyên VNĐ lớn hơn 0.';
  else if (!Number.isFinite(date)) message = 'Vui lòng chọn ngày giờ hợp lệ.';
  if (message) { $('#form-error').textContent = message; $('#form-error').hidden = false; return; }
  $('#form-error').hidden = true;
  const record = {
    id: previous?.id ?? (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    amount, kind: editorKind, categoryId: editorCategory, date,
    note: $('#note').value.trim().slice(0, 240),
    image, thumb,
    createdAt: previous?.createdAt ?? Date.now(),
    updatedAt: Date.now()
  };
  const button = $('#save-button');
  button.disabled = true;
  button.textContent = 'Đang lưu...';
  try {
    await saveTransaction(record);
    await refreshData();
    closeEditor();
    setToast(previous ? 'Đã cập nhật giao dịch.' : 'Đã lưu giao dịch mới!');
  } catch (err) {
    console.error(err);
    $('#form-error').textContent = 'Không lưu được giao dịch. Kiểm tra dung lượng thiết bị và thử lại.';
    $('#form-error').hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = editorId ? 'Cập nhật giao dịch →' : 'Lưu giao dịch →';
  }
}

function setScreen(next) {
  if (!['home', 'stats', 'settings'].includes(next)) return;
  screen = next;
  document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== `view-${screen}`; });
  document.querySelectorAll('[data-screen]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.screen === screen));
  if (screen === 'stats') renderStats();
  if (screen === 'settings') renderSettings();
  window.scrollTo({ top:0, behavior:'instant' });
}
function monthlyRecords() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth()+1, 1).getTime();
  return records.filter(r => r.date >= start && r.date < end);
}
function totals(items) {
  return items.reduce((out, r) => {
    if (r.kind === 'income') out.income += r.amount;
    else out.expense += r.amount;
    return out;
  }, { income:0, expense:0 });
}
function renderHome() {
  const sum = totals(monthlyRecords());
  const balance = sum.income - sum.expense;
  $('#home-balance').textContent = money(balance);
  $('#home-income').textContent = money(sum.income);
  $('#home-expense').textContent = money(sum.expense);
  $('#entry-count').textContent = records.length;
  $('#today-label').textContent = new Intl.DateTimeFormat('vi-VN', { day:'numeric', month:'short' }).format(new Date());
  renderFeed();
}
function renderFeed() {
  clearUrls(feedUrls); feedUrls = [];
  const container = $('#feed-list');
  const query = $('#search-input').value.trim().toLocaleLowerCase('vi-VN');
  const filtered = records.filter(r => !query || `${r.note} ${categoryOf(r.categoryId).name} ${money(r.amount)}`.toLocaleLowerCase('vi-VN').includes(query));
  container.classList.toggle('is-grid', feedMode === 'grid');
  $('#mode-feed').classList.toggle('is-active', feedMode === 'feed');
  $('#mode-grid').classList.toggle('is-active', feedMode === 'grid');
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-art" aria-hidden="true">${records.length ? '🔎' : '📸'}</div><h3>${records.length?'Không tìm thấy giao dịch':'Nhật ký của bạn đang chờ'}</h3><p>${records.length?'Hãy thử một từ khóa khác nhé.':'Chụp một tấm ảnh và bắt đầu lưu lại những khoản thu chi hằng ngày.'}</p>${records.length?'':'<button type="button" id="empty-add">＋ Thêm giao dịch đầu tiên</button>'}</div>`;
    return;
  }
  let lastDay = '';
  container.innerHTML = filtered.map(r => {
    const day = formatDateInput(r.date);
    const divider = feedMode === 'feed' && lastDay !== day ? `<div class="day-divider">${escapeHTML(dateDay(r.date))}</div>` : '';
    lastDay = day;
    const cat = categoryOf(r.categoryId);
    const url = imageSrc(r.thumb || r.image, feedUrls);
    const prefix = r.kind === 'income' ? '+' : '−';
    const time = new Intl.DateTimeFormat('vi-VN', { hour:'2-digit',minute:'2-digit' }).format(new Date(r.date));
    return `${divider}<button type="button" class="feed-card" data-record="${escapeHTML(r.id)}" aria-label="Xem giao dịch ${cat.name}, ${money(r.amount)}"><img loading="lazy" src="${url}" alt="Ảnh ${escapeHTML(cat.name)}"><div class="feed-card-content"><div><strong class="${r.kind === 'income'?'income-amount':'expense-amount'}">${prefix}${money(r.amount)}</strong><small>${time} ${r.note ? `· ${escapeHTML(r.note)}` : ''}</small></div><span class="category-chip">${cat.emoji} ${cat.name}</span></div></button>`;
  }).join('');
}
function getRange() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  if (statsPeriod === 'week') {
    const weekday = (today.getDay() + 6) % 7;
    const start = new Date(y,m,d-weekday).getTime();
    return { start, end: new Date(y,m,d-weekday+7).getTime(), caption:'Tuần này' };
  }
  if (statsPeriod === 'year') return { start: new Date(y,0,1).getTime(), end:new Date(y+1,0,1).getTime(), caption:'Năm nay' };
  if (statsPeriod === 'custom' && customRange) return { ...customRange, caption:'Tùy chọn' };
  return { start:new Date(y,m,1).getTime(), end:new Date(y,m+1,1).getTime(), caption:'Tháng này' };
}
function renderStats() {
  const range = getRange();
  const list = records.filter(r => r.date >= range.start && r.date < range.end);
  const { income, expense } = totals(list);
  $('#stat-income').textContent = money(income);
  $('#stat-expense').textContent = money(expense);
  $('#donut-total').textContent = money(expense);
  $('#period-caption').textContent = range.caption;
  $('#custom-dates').hidden = statsPeriod !== 'custom';
  document.querySelectorAll('[data-period]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.period === statsPeriod));
  const agg = new Map();
  list.filter(r=>r.kind==='expense').forEach(r => agg.set(r.categoryId, (agg.get(r.categoryId)||0)+r.amount));
  const data = [...agg].map(([id,value])=> ({...categoryOf(id),value})).sort((a,b)=>b.value-a.value);
  if (!data.length || expense === 0) {
    $('#donut-chart').style.background = 'conic-gradient(#eaf0e6 0 100%)';
    $('#category-legend').innerHTML = '<p class="no-chart">Chưa có khoản chi trong thời gian này.</p>';
    $('#category-breakdown').innerHTML = '<p class="no-chart">Hãy thêm giao dịch để xem biểu đồ chi tiêu.</p>';
    return;
  }
  let offset = 0;
  const gradients = data.map(c => {
    const from = offset;
    offset += c.value / expense * 100;
    return `${c.color} ${from.toFixed(3)}% ${offset.toFixed(3)}%`;
  });
  $('#donut-chart').style.background = `conic-gradient(${gradients.join(',')})`;
  $('#donut-chart').setAttribute('aria-label',`Phân bổ chi tiêu: ${data.map(c=>`${c.name}: ${money(c.value)}`).join('; ')}`);
  $('#category-legend').innerHTML = data.slice(0,5).map(cat => `<div class="legend-item"><span class="legend-dot" style="background:${cat.color}"></span><span>${cat.name}</span><strong>${(cat.value/expense*100).toFixed(1)}%</strong></div>`).join('');
  $('#category-breakdown').innerHTML = data.map(cat => `<div class="breakdown-item"><div class="breakdown-head"><span class="cat-emoji">${cat.emoji}</span><span>${cat.name}</span><strong>${money(cat.value)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${(cat.value/expense*100).toFixed(2)}%;background:${cat.color}"></div></div></div>`).join('');
}
async function renderSettings() {
  $('#settings-count').textContent = records.length;
  try {
    const { usage } = await navigator.storage.estimate();
    $('#storage-usage').textContent = usage >= 1024*1024 ? `${(usage/1024/1024).toFixed(1)} MB` : `${Math.round((usage||0)/1024)} KB`;
  } catch { $('#storage-usage').textContent = '—'; }
}
async function refreshData() {
  records = await allTransactions();
  renderHome();
  if (screen === 'stats') renderStats();
  if (screen === 'settings') renderSettings();
}
function blobToDataUrl(blob) {
  if (!(blob instanceof Blob)) return Promise.reject(new Error('Ảnh không hợp lệ'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function dataUrlToBlob(value) {
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/i.test(value)) throw new Error('Ảnh sao lưu không hợp lệ.');
  const [header, body] = value.split(',',2);
  const decoded = atob(body);
  const bytes = new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++) bytes[i]=decoded.charCodeAt(i);
  return new Blob([bytes], {type:header.slice(5).split(';')[0]});
}
async function exportData() {
  if (!records.length) { setToast('Chưa có giao dịch để sao lưu.'); return; }
  const button = $('#export-button'); button.disabled = true;
  setToast('Đang đóng gói ảnh và giao dịch...');
  try {
    const serialized = [];
    for (const record of records) {
      serialized.push({ ...record, image: await blobToDataUrl(record.image), thumb: await blobToDataUrl(record.thumb ?? record.image) });
    }
    const blob = new Blob([JSON.stringify({ app:'lumi-ledger',version:1,exportedAt:new Date().toISOString(),transactions:serialized })],{type:'application/json'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = `lumi-ledger-sao-luu-${formatDateInput(Date.now())}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    setToast('Đã tạo file sao lưu. Hãy lưu file vào Tệp (Files) hoặc iCloud Drive.');
  } catch (err) { console.error(err);setToast('Không thể xuất bản sao lưu.'); }
  finally { button.disabled = false; }
}
async function importData(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) { setToast('File sao lưu quá lớn (giới hạn 100 MB).'); return; }
  try {
    const payload = JSON.parse(await file.text());
    if (payload.app !== 'lumi-ledger' || payload.version !== 1 || !Array.isArray(payload.transactions)) throw new Error('Không đúng định dạng sao lưu Lumi Ledger V1.');
    if (payload.transactions.length > 20000) throw new Error('File sao lưu có quá nhiều giao dịch.');
    const restored = [];
    for (const raw of payload.transactions) {
      if (!raw || typeof raw.id !== 'string' || raw.id.length > 160 || !['income','expense'].includes(raw.kind) || !Number.isSafeInteger(raw.amount) || raw.amount <= 0 || !Number.isFinite(raw.date) || !ALL_CATEGORIES.some(c=>c.id===raw.categoryId)) throw new Error('Phát hiện dữ liệu giao dịch không hợp lệ.');
      restored.push({ id:raw.id, amount:raw.amount, kind:raw.kind, categoryId:raw.categoryId, date:raw.date,
        note:String(raw.note||'').slice(0,240), createdAt:Number(raw.createdAt)||raw.date, updatedAt:Date.now(),
        image:dataUrlToBlob(raw.image), thumb:dataUrlToBlob(raw.thumb||raw.image)
      });
    }
    if (!window.confirm(`Nhập ${restored.length} giao dịch từ file sao lưu? Dữ liệu trùng mã sẽ được thay bằng bản sao lưu.`)) return;
    await saveMany(restored);
    await refreshData();
    setToast(`Đã khôi phục ${restored.length} giao dịch.`);
  } catch (err) { console.error(err); setToast(err.message || 'Không thể mở file sao lưu.'); }
}

function bindEvents() {
  $('#nav-add').addEventListener('click',()=>showEditor());
  $('#quick-add').addEventListener('click',()=>showEditor());
  document.querySelectorAll('[data-screen]').forEach(btn=>btn.addEventListener('click',()=>setScreen(btn.dataset.screen)));
  $('#mode-feed').addEventListener('click',()=>setFeedMode('feed'));
  $('#mode-grid').addEventListener('click',()=>setFeedMode('grid'));
  $('#search-input').addEventListener('input',renderFeed);
  $('#feed-list').addEventListener('click',event=>{
    if (event.target.closest('#empty-add')) return showEditor();
    const card = event.target.closest('[data-record]');
    if (card) showDetail(card.dataset.record);
  });
  $('#editor-close').addEventListener('click',closeEditor);
  $('#detail-close').addEventListener('click',closeDetail);
  $('#take-photo').addEventListener('click',()=>$('#camera-input').click());
  $('#pick-photo').addEventListener('click',()=>$('#gallery-input').click());
  $('#camera-input').addEventListener('change',photoSelected);
  $('#gallery-input').addEventListener('change',photoSelected);
  document.querySelectorAll('[data-kind]').forEach(btn=>btn.addEventListener('click',()=>setKind(btn.dataset.kind)));
  $('#category-options').addEventListener('click',event=>{
    const btn = event.target.closest('[data-category]');
    if (btn) { editorCategory = btn.dataset.category; renderCategoryOptions(); }
  });
  $('#amount').addEventListener('input',event=>{
    const raw = event.target.value.replace(/\D/g, '').slice(0,16);
    event.target.value = raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '';
  });
  $('#transaction-form').addEventListener('submit',submitTransaction);
  $('#edit-button').addEventListener('click',()=>showEditor(detailId));
  $('#delete-button').addEventListener('click',async()=>{
    if (!detailId || !window.confirm('Bạn chắc chắn muốn xóa giao dịch này? Ảnh cũng sẽ bị xóa khỏi ứng dụng.')) return;
    const id=detailId;
    try { await removeTransaction(id); closeDetail(); await refreshData(); setToast('Đã xóa giao dịch.'); }
    catch(err) { console.error(err);setToast('Không thể xóa giao dịch.'); }
  });
  document.querySelectorAll('[data-period]').forEach(btn=>btn.addEventListener('click',()=>{
    statsPeriod = btn.dataset.period;
    if (statsPeriod==='custom' && !customRange) {
      const today = new Date();
      $('#start-date').value = formatDateInput(new Date(today.getFullYear(),today.getMonth(),1));
      $('#end-date').value = formatDateInput(today);
    }
    renderStats();
  }));
  $('#apply-dates').addEventListener('click',()=>{
    const startValue = $('#start-date').value;
    const endValue = $('#end-date').value;
    if (!startValue || !endValue) { setToast('Hãy chọn đủ ngày bắt đầu và kết thúc.'); return; }
    const start = new Date(`${startValue}T00:00:00`).getTime();
    const end = new Date(`${endValue}T00:00:00`).getTime();
    if (!Number.isFinite(start)||!Number.isFinite(end)||start>end) { setToast('Khoảng ngày không hợp lệ.'); return; }
    const inclusiveEnd = new Date(`${endValue}T00:00:00`); inclusiveEnd.setDate(inclusiveEnd.getDate()+1);
    customRange={start,end:inclusiveEnd.getTime()};
    renderStats();
  });
  $('#export-button').addEventListener('click',exportData);
  $('#import-button').addEventListener('click',()=>$('#import-file').click());
  $('#import-file').addEventListener('change',importData);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape') {
      if(!$('#editor-overlay').hidden) closeEditor();
      else if(!$('#detail-overlay').hidden) closeDetail();
    }
  });
}
function setFeedMode(mode) {
  feedMode = mode;
  try { localStorage.setItem('lumi-view', mode); } catch {}
  renderFeed();
}
async function start() {
  bindEvents();
  try { await refreshData(); }
  catch(err) {
    console.error(err);
    $('#feed-list').innerHTML='<div class="empty-state"><h3>Không thể mở bộ nhớ</h3><p>Vui lòng mở website bằng Safari thông thường, không dùng chế độ riêng tư. Đảm bảo thiết bị còn dung lượng trống.</p></div>';
    setToast('Không thể truy cập dữ liệu lưu trữ.');
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    try { await navigator.serviceWorker.register('./sw.js'); }
    catch (err) { console.warn('Offline cache chưa hoạt động:',err); }
  }
  if (new URLSearchParams(location.search).get('action') === 'add' || new URLSearchParams(location.search).get('action') === 'capture') {
    showEditor();
  }
}
start();
