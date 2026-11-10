'use strict';

const $ = id => document.getElementById(id);
const API = '/api';

let user = null;
let authMode = 'register';
let companies = [];
let holdings = [];
let history = [];
let selectedCompany = null;
let selectedIndicatorCompanyId = null;
let marketPriceHistory = {};
let tradeMode = 'BUY';

const style = document.createElement('style');
style.textContent = `
.yx-auth{position:fixed;inset:0;z-index:10000;background:#f4f7f5;display:grid;place-items:center;padding:20px}
.yx-auth-card{width:100%;max-width:390px;background:white;border-radius:22px;padding:26px;box-shadow:0 12px 45px #14271b12}
.yx-auth-logo{font-size:30px;font-weight:900;color:#176b55;margin-bottom:8px}
.yx-auth-desc{color:#84908a;font-size:14px;line-height:1.8;margin-bottom:22px}
.yx-auth-input{width:100%;box-sizing:border-box;padding:15px;border:1px solid #dce5df;border-radius:12px;font-size:16px;outline:none}
.yx-auth-input:focus{border-color:#176b55}
.yx-auth-button{width:100%;padding:15px;border:0;border-radius:12px;background:#16845b;color:white;font-size:16px;font-weight:bold;margin-top:14px}
.yx-auth-error{color:#d65353;font-size:13px;margin-top:12px;min-height:20px}
.yx-account{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;margin:10px 0;background:#fff;border-radius:12px;font-size:13px}
.yx-account button{border:0;background:#edf4f0;color:#176b55;padding:8px 12px;border-radius:9px}
.yx-overlay{position:fixed;inset:0;background:#17231f77;z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:12px}
.yx-modal{background:#f8faf9;width:100%;max-width:520px;max-height:88vh;overflow:auto;border-radius:22px;padding:20px;color:#202b27}
.yx-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.yx-head h2{font-size:20px;margin:0}
.yx-close{border:0;background:#e9efeb;border-radius:50%;width:36px;height:36px;font-size:20px}
.yx-company{width:100%;display:flex;align-items:center;gap:12px;text-align:right;background:white;border:2px solid transparent;border-radius:14px;padding:13px;margin:8px 0;color:#202b27}
.yx-company.selected{border-color:#176b55;background:#f0f7f3}
.yx-company .yx-info{flex:1}
.yx-company strong{display:block;font-size:14px}
.yx-company small{display:block;color:#89938e;margin-top:5px}
.yx-company .yx-price{direction:ltr;text-align:left;font-weight:bold;font-size:13px}
.yx-check{color:#176b55;font-weight:bold}
.yx-field{display:block;font-size:13px;margin:16px 0 7px}
.yx-input{width:100%;box-sizing:border-box;padding:14px;border:1px solid #dce5df;border-radius:12px;background:white;font-size:16px;outline:none}
.yx-input:focus{border-color:#176b55}
.yx-submit{width:100%;border:0;border-radius:13px;padding:15px;margin-top:16px;background:#16845b;color:white;font-size:16px;font-weight:bold}
.yx-submit.sell{background:#d65353}
.yx-submit:disabled{opacity:.45}
.yx-note{font-size:12px;color:#77817c;margin-top:10px;line-height:1.7}
.yx-create{width:100%;border:1px dashed #176b55;color:#176b55;background:white;border-radius:13px;padding:13px;margin:12px 0;font-size:14px;font-weight:bold}
.yx-company-icon{width:42px;height:42px;flex-shrink:0;border-radius:12px;background:#edf4f0;color:#176b55;display:grid;place-items:center;font-weight:bold}
`;
document.head.appendChild(style);

const auth = document.createElement('div');
auth.className = 'yx-auth';
auth.innerHTML = `
  <div class="yx-auth-card">
    <div class="yx-auth-logo">YonoX</div>
    <div class="yx-auth-desc" id="yx-auth-desc">Create your YonoX account.</div>
    <form id="yx-auth-form">
      <label class="yx-field" id="yx-username-label" for="yx-username">Username</label>
      <input class="yx-auth-input" id="yx-username" maxlength="20"
        minlength="3" pattern="[A-Za-z0-9_]{3,20}"
        placeholder="Username" autocomplete="username" required>
      <label class="yx-field" id="yx-token-label" for="yx-token" hidden>Account token</label>
      <input class="yx-auth-input" id="yx-token" type="text"
        placeholder="Paste account token" autocomplete="off"
        autocapitalize="none" spellcheck="false" hidden>
      <button class="yx-auth-button" id="yx-auth-submit">Create account</button>
    </form>
    <button type="button" id="yx-auth-switch"
      style="margin-top:12px;width:100%;padding:11px;border:1px solid #dce5df;border-radius:10px;background:#f4f8f5;color:#176b55;font-weight:bold">
      Already have an account? Log in
    </button>
    <div class="yx-auth-error" id="yx-auth-error"></div>
    <div class="yx-note" id="yx-auth-note">Username: 3-20 letters, numbers or underscores.</div>
  </div>`;
document.body.appendChild(auth);

const overlay = document.createElement('div');
overlay.className = 'yx-overlay';
overlay.style.display = 'none';
overlay.innerHTML = `
  <div class="yx-modal">
    <div class="yx-head">
      <h2 id="yx-title">اختر الشركة</h2>
      <button class="yx-close" id="yx-close" aria-label="إغلاق">×</button>
    </div>
    <div id="yx-company-list"></div>
    <div id="yx-transaction" style="display:none">
      <label class="yx-field" for="yx-quantity">عدد الأسهم</label>
      <input class="yx-input" id="yx-quantity" type="number" min="1" step="1" placeholder="مثلاً 5">
      <div class="yx-note" id="yx-calculation"></div>
      <button class="yx-submit" id="yx-confirm">تأكيد العملية</button>
    </div>
  </div>`;
document.body.appendChild(overlay);

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

async function request(route, options = {}) {
  const response = await fetch(API + route, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function setAuthMode(mode) {
  authMode = mode === 'login' ? 'login' : 'register';
  const login = authMode === 'login';

  $('yx-username-label').hidden = login;
  $('yx-username').hidden = login;
  $('yx-username').required = !login;
  $('yx-token-label').hidden = !login;
  $('yx-token').hidden = !login;
  $('yx-token').required = login;

  $('yx-auth-desc').textContent = login
    ? 'Enter your account token to log in.'
    : 'Create your YonoX account using a username.';
  $('yx-auth-note').textContent = login
    ? 'Your account token is available on the Account page.'
    : 'Username: 3-20 letters, numbers or underscores.';
  $('yx-auth-submit').textContent = login ? 'Log in' : 'Create account';
  $('yx-auth-switch').textContent = login
    ? 'Create a new account'
    : 'Already have an account? Log in';
}

function showAuth(message = '') {
  auth.style.display = 'grid';
  $('yx-auth-error').textContent = message;
  $('yx-username').value = '';
  $('yx-token').value = '';
  setAuthMode(authMode);
  (authMode === 'login' ? $('yx-token') : $('yx-username')).focus();
}

function addAccountBar() {
  let bar = $('yx-account-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'yx-account-bar';
    bar.className = 'yx-account';
    const main = document.querySelector('main') || document.body;
    main.prepend(bar);
  }
  bar.innerHTML = `
    <span>الحساب: <strong id="yx-account-name"></strong></span>
    <button id="yx-logout">تسجيل الخروج</button>`;
  $('yx-account-name').textContent = user.username;
  $('yx-logout').addEventListener('click', logout);
}

async function loadMarket() {
  const data = await request('/market');
  marketPriceHistory = data.priceHistory || {};
  companies = data.companies.map(c => ({
    id: c.id,
    name: c.name,
    ticker: c.ticker,
    price: Number(c.current_price),
    initial: Number(c.initial_price),
    changePct: c.initial_price
      ? ((Number(c.current_price) - Number(c.initial_price)) / Number(c.initial_price)) * 100
      : 0,
    total: Number(c.total_shares),
    available: Number(c.available_shares)
  }));
}

async function loadPortfolio() {
  const data = await request('/portfolio');
  user = data.user;
  holdings = data.holdings;
  history = data.history;
}

function updateMarketIndicator(company) {
  const market = document.querySelector('.market');
  if (!market || !company) return;

  const label = market.querySelector('.market-top span:first-child');
  const percentage = market.querySelector('.market-top span:last-child');
  const number = market.querySelector('.market-number');
  const daily = Array.from(market.children).find(
    element => element.tagName === 'SPAN'
  );

  const change = Number(company.changePct || 0);
  const difference = Number(company.price) - Number(company.initial);
  const positive = change >= 0;
  const color = positive ? '#16845b' : '#d65353';

  if (label) label.textContent = `${company.name} · ${company.ticker}`;

  if (percentage) {
    percentage.className = positive ? 'up' : 'change';
    percentage.style.color = color;
    percentage.textContent =
      `${positive ? '▲' : '▼'} ${positive ? '+' : ''}${change.toFixed(2)}%`;
  }

  if (number) number.textContent = money(company.price);

  if (daily) {
    daily.className = positive ? 'up' : 'change';
    daily.style.color = color;
    daily.textContent = window.yonoxT
      ? `${difference > 0 ? '+' : ''}${money(difference)} YNC ${window.yonoxT('compared with initial price')}`
      : `${difference > 0 ? '+' : ''}${money(difference)} YNC مقارنة بسعر التأسيس`;
  }

  const chart = market.querySelector('.chart');
  if (!chart) return;

  const paths = chart.querySelectorAll('path');
  const areaPath = Array.from(paths).find(
    path => path.hasAttribute('fill') && !path.hasAttribute('stroke')
  );
  const linePath = Array.from(paths).find(
    path => path.hasAttribute('stroke')
  );

  if (!linePath) return;

  let values = marketPriceHistory[company.id];
  values = Array.isArray(values)
    ? values.map(Number).filter(Number.isFinite)
    : [];

  if (!values.length) values = [Number(company.price)];
  if (values.length === 1) values = [values[0], values[0]];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = max === min
    ? Math.max(Math.abs(max) * 0.01, 1)
    : (max - min) * 0.12;

  const low = min - padding;
  const high = max + padding;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 320;
    const y = 8 + ((high - value) / (high - low)) * 74;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  const lineData = points.join(' ');
  linePath.setAttribute('d', lineData);
  linePath.style.display = 'none';

  chart.querySelectorAll('.dynamic-segment').forEach(segment => segment.remove());

  const svgNS = 'http://www.w3.org/2000/svg';
  for (let i = 1; i < values.length; i++) {
    const x1 = ((i - 1) / (values.length - 1)) * 320;
    const x2 = (i / (values.length - 1)) * 320;
    const y1 = 8 + ((high - values[i - 1]) / (high - low)) * 74;
    const y2 = 8 + ((high - values[i]) / (high - low)) * 74;

    const segment = document.createElementNS(svgNS, 'path');
    segment.setAttribute('class', 'dynamic-segment');
    segment.setAttribute('d', `M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)}`);
    segment.setAttribute(
      'stroke',
      values[i] > values[i - 1] ? '#16845b' :
      values[i] < values[i - 1] ? '#d65353' : '#89938e'
    );
    segment.setAttribute('fill', 'none');
    segment.setAttribute('stroke-width', '2.5');
    segment.setAttribute('stroke-linecap', 'round');
    segment.setAttribute('stroke-linejoin', 'round');
    segment.setAttribute('vector-effect', 'non-scaling-stroke');
    chart.appendChild(segment);
  }

  if (areaPath) {
    areaPath.setAttribute('d', `${lineData} L320 90 L0 90 Z`);
  }

  chart.querySelectorAll('linearGradient stop').forEach(stop => {
    stop.setAttribute('stop-color', color);
  });
}
function renderMarket() {
  const firstCompany = document.querySelector('.company');
  if (!firstCompany) return;
  const section = firstCompany.parentElement;
  section.innerHTML = '';

  companies.forEach(company => {
    const card = document.createElement('div');
    card.className = 'company';
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      selectedIndicatorCompanyId = company.id;
      updateMarketIndicator(company);
    });

    const icon = document.createElement('div');
    icon.className = 'company-icon';
    icon.textContent = company.ticker[0];

    const info = document.createElement('div');
    info.className = 'company-info';

    const name = document.createElement('div');
    name.className = 'company-name';
    name.textContent = company.name;

    const ticker = document.createElement('div');
    ticker.className = 'ticker';
    ticker.textContent = company.ticker;

    info.append(name, ticker);

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = money(company.price) + ' YNC';

    const available = document.createElement('div');
    available.className = 'change';
    const change = Number(company.changePct || 0);
    const sign = change > 0 ? '+' : '';
    available.style.color = change > 0 ? '#16845b' : change < 0 ? '#d65353' : '#89938e';
    available.textContent = window.yonoxT
      ? `${window.yonoxT('Available')} ${company.available.toLocaleString('en-US')} ${window.yonoxT('share')} · ${sign}${change.toFixed(2)}% ${window.yonoxT('from the initial price')}`
      : `متاح ${company.available.toLocaleString('en-US')} سهم · ${sign}${change.toFixed(2)}% من سعر التأسيس`;

    price.appendChild(available);
    card.append(icon, info, price);
    section.appendChild(card);
  });

  const create = document.createElement('button');
  create.className = 'yx-create';
  create.textContent = '+ إنشاء شركة جديدة';
  create.addEventListener('click', openCreateCompany);
  section.appendChild(create);

  if (selectedIndicatorCompanyId === null && companies.length) {
    selectedIndicatorCompanyId = companies[0].id;
  }

  if (selectedIndicatorCompanyId !== null) {
    const selected = companies.find(
      company => company.id === selectedIndicatorCompanyId
    );
    if (selected) updateMarketIndicator(selected);
  }
}

function renderHoldings() {
  const balance = document.querySelector('.balance-value');
  if (balance) balance.textContent = money(user.balance) + ' YNC';

  let section = $('my-holdings');
  if (!section) {
    section = document.createElement('section');
    section.id = 'my-holdings';
    section.innerHTML = `
      <div class="section-title"><h2>أسهمك</h2><span>محفظتي</span></div>
      <div id="holdings-list"></div>`;
    const demo = document.querySelector('.demo');
    if (demo) demo.before(section);
    else document.querySelector('main').append(section);
  }

  const list = $('holdings-list');
  list.innerHTML = '';

  const owned = holdings.filter(h => Number(h.quantity) > 0);
  if (!owned.length) {
    const empty = document.createElement('div');
    empty.className = 'company';
    empty.textContent = 'لا تمتلك أي أسهم حاليًا';
    list.appendChild(empty);
    return;
  }

  owned.forEach(h => {
    const card = document.createElement('div');
    card.className = 'company';

    const icon = document.createElement('div');
    icon.className = 'company-icon';
    icon.textContent = h.ticker[0];

    const info = document.createElement('div');
    info.className = 'company-info';

    const name = document.createElement('div');
    name.className = 'company-name';
    name.textContent = h.name;

    const ticker = document.createElement('div');
    ticker.className = 'ticker';
    ticker.textContent = h.ticker;
    info.append(name, ticker);

    const amount = document.createElement('div');
    amount.className = 'price';
    amount.textContent = `${h.quantity} ${window.yonoxT ? window.yonoxT('share') : 'سهم'}`;

    const value = document.createElement('div');
    value.className = 'change up';
    value.textContent = money(h.quantity * h.current_price) + ' YNC';
    amount.appendChild(value);

    card.append(icon, info, amount);
    list.appendChild(card);
  });
}

function render() {
  renderMarket();
  renderHoldings();
}


function openTrade(mode) {
  tradeMode = mode;
  $('yx-title').textContent = mode === 'BUY' ? 'شراء الأسهم' : 'بيع الأسهم';
  $('yx-transaction').style.display = 'none';
  $('yx-quantity').value = '';
  $('yx-quantity').style.display = '';
  $('yx-calculation').style.display = '';
  $('yx-confirm').className = 'yx-submit' + (mode === 'SELL' ? ' sell' : '');
  $('yx-confirm').textContent = mode === 'BUY' ? 'تأكيد الشراء' : 'تأكيد البيع';
  $('yx-confirm').onclick = confirmTrade;
  renderCompanyChoices();
  overlay.style.display = 'flex';
}

function renderCompanyChoices() {
  const list = $('yx-company-list');
  list.innerHTML = '';

  const choices = companies.filter(c => tradeMode === 'BUY'
    ? c.available > 0
    : holdings.some(h => h.company_id === c.id && h.quantity > 0));

  if (!choices.length) {
    list.textContent = tradeMode === 'BUY'
      ? 'لا توجد أسهم متاحة للشراء.'
      : 'لا تمتلك أسهمًا للبيع.';
    $('yx-transaction').style.display = 'none';
    return;
  }

  choices.forEach(company => {
    const button = document.createElement('button');
    button.className = 'yx-company' +
      (selectedCompany?.id === company.id ? ' selected' : '');

    const icon = document.createElement('span');
    icon.className = 'yx-company-icon';
    icon.textContent = company.ticker[0];

    const info = document.createElement('span');
    info.className = 'yx-info';

    const name = document.createElement('strong');
    name.textContent = company.name;

    const detail = document.createElement('small');
    const owned = holdings.find(h => h.company_id === company.id)?.quantity || 0;
    detail.textContent = tradeMode === 'BUY'
      ? `${company.ticker} · متاح ${company.available} سهم`
      : `${company.ticker} · تملك ${owned} سهم`;

    info.append(name, detail);

    const price = document.createElement('span');
    price.className = 'yx-price';
    price.textContent = money(company.price) + ' YNC';

    button.append(icon, info, price);
    button.addEventListener('click', () => {
      selectedCompany = company;
      renderCompanyChoices();
      showQuantity();
    });
    list.appendChild(button);
  });

  if (!selectedCompany || !choices.some(c => c.id === selectedCompany.id)) {
    selectedCompany = choices[0];
    renderCompanyChoices();
    return;
  }
  showQuantity();
}

function showQuantity() {
  $('yx-transaction').style.display = 'block';
  $('yx-quantity').value = '';
  const owned = holdings.find(h => h.company_id === selectedCompany.id)?.quantity || 0;
  $('yx-quantity').max = tradeMode === 'BUY' ? selectedCompany.available : owned;
  updateCalculation();
}

function updateCalculation() {
  const quantity = Number($('yx-quantity').value);
  const valid = Number.isSafeInteger(quantity) && quantity > 0;
  const total = valid ? quantity * selectedCompany.price : 0;

  $('yx-calculation').textContent = valid
    ? `الإجمالي: ${money(total)} YNC · سعر السهم: ${money(selectedCompany.price)} YNC`
    : `رصيدك: ${money(user.balance)} YNC`;

  $('yx-confirm').disabled = !valid;
}

async function confirmTrade() {
  const quantity = Number($('yx-quantity').value);
  if (!selectedCompany || !Number.isSafeInteger(quantity) || quantity < 1) return;

  $('yx-confirm').disabled = true;
  try {
    const result = await request('/trade', {
      method: 'POST',
      body: JSON.stringify({
        companyId: selectedCompany.id,
        quantity,
        side: tradeMode
      })
    });

    await refresh();
    overlay.style.display = 'none';
    alert(`تمت العملية بنجاح. الإجمالي: ${money(result.trade.total)} YNC`);
  } catch (error) {
    alert(error.message);
    $('yx-confirm').disabled = false;
  }
}

function openCreateCompany() {
  $('yx-title').textContent = 'إنشاء شركة جديدة';
  $('yx-company-list').innerHTML = `
    <label class="yx-field" for="yx-new-name">اسم الشركة</label>
    <input class="yx-input" id="yx-new-name" maxlength="40" placeholder="اسم الشركة">
    <label class="yx-field" for="yx-new-ticker">رمز الشركة</label>
    <input class="yx-input" id="yx-new-ticker" maxlength="8" placeholder="مثلاً BLUE" dir="ltr">
    <label class="yx-field" for="yx-new-shares">عدد الأسهم</label>
    <input class="yx-input" id="yx-new-shares" type="number" min="1" step="1">
    <label class="yx-field" for="yx-new-price">السعر الأولي للسهم (YNC)</label>
    <input class="yx-input" id="yx-new-price" type="number" min="0.01" step="0.01">
    <p class="yx-note">هذه شركة افتراضية. لا يمكن تغيير رمزها بعد إنشائها.</p>`;
  $('yx-transaction').style.display = 'block';
  $('yx-quantity').style.display = 'none';
  $('yx-calculation').style.display = 'none';
  $('yx-confirm').disabled = false;
  $('yx-confirm').textContent = 'إنشاء الشركة';
  $('yx-confirm').className = 'yx-submit';
  $('yx-confirm').onclick = createCompany;
  overlay.style.display = 'flex';
}

async function createCompany() {
  const name = $('yx-new-name').value.trim();
  const ticker = $('yx-new-ticker').value.trim().toUpperCase();
  const totalShares = Number($('yx-new-shares').value);
  const initialPrice = Number($('yx-new-price').value);

  $('yx-confirm').disabled = true;
  try {
    await request('/companies', {
      method: 'POST',
      body: JSON.stringify({ name, ticker, totalShares, initialPrice })
    });
    await refresh();
    overlay.style.display = 'none';
    alert('تم إنشاء الشركة بنجاح.');
  } catch (error) {
    alert(error.message);
    $('yx-confirm').disabled = false;
  }
}

async function refresh() {
  await loadMarket();
  await loadPortfolio();
  render();
}

let marketPollingBusy = false;
setInterval(async () => {
  if (document.hidden || marketPollingBusy) return;
  marketPollingBusy = true;
  try {
    await loadMarket();
    renderMarket();
    if (typeof user !== 'undefined' && user) renderHoldings();
  } catch (error) {
    console.warn('Market refresh failed:', error.message);
  } finally {
    marketPollingBusy = false;
  }
}, 5000);

async function logout() {
  if (!confirm('هل تريد تسجيل الخروج من هذا الجهاز؟')) return;
  try {
    await request('/logout', { method: 'POST' });
    location.reload();
  } catch (error) {
    alert(error.message);
  }
}

async function finishAuthentication(data) {
  user = data.user;
  await refresh();
  addAccountBar();
  auth.style.display = 'none';
  await loadMathStatus();

  window.yonoxOwnershipLoad?.().catch(error =>
    console.error('Ownership loading failed:', error)
  );

  if (data.token) window.yonoxShowAccountToken?.(data.token);
}

$('yx-auth-switch').addEventListener('click', () => {
  $('yx-auth-error').textContent = '';
  setAuthMode(authMode === 'register' ? 'login' : 'register');
});

$('yx-auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const login = authMode === 'login';
  const button = $('yx-auth-submit');
  const body = login
    ? { token: $('yx-token').value.trim() }
    : { username: $('yx-username').value.trim() };

  button.disabled = true;
  button.textContent = login ? 'Logging in...' : 'Creating account...';

  try {
    const data = await request(login ? '/login' : '/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    await finishAuthentication(data);
  } catch (error) {
    $('yx-auth-error').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = authMode === 'login' ? 'Log in' : 'Create account';
  }
});

$('yx-quantity').addEventListener('input', updateCalculation);
$('yx-close').addEventListener('click', () => overlay.style.display = 'none');
overlay.addEventListener('click', event => {
  if (event.target === overlay) overlay.style.display = 'none';
});

document.querySelector('.buy')?.addEventListener('click', () => openTrade('BUY'));
document.querySelector('.sell')?.addEventListener('click', () => openTrade('SELL'));

async function start() {
  try {
    const data = await request('/me');
    user = data.user;
    await refresh();
    addAccountBar();
    auth.style.display = 'none';
    await loadMathStatus();
    window.yonoxOwnershipLoad?.().catch(error =>
      console.error('Ownership loading failed:', error)
    );
  } catch (error) {
    if (error.message === 'Please log in.') {
      showAuth();
      return;
    }
    showAuth('تعذر الاتصال بالخادم. حدّث الصفحة وحاول مجددًا.');
  }
}

start();




let mathActiveQuestion = null;

function renderMathStatus(data) {
  $('math-stats').textContent =
    `المحاولات المستخدمة: ${data.attempts} / 20 · المتبقية: ${data.remaining} · مكافآتك اليوم: ${data.totalReward} YNC`;

  mathActiveQuestion = data.activeQuestion || null;

  if (mathActiveQuestion) {
    $('math-difficulty').value = mathActiveQuestion.difficulty;
    $('math-difficulty').disabled = true;
    $('math-question').textContent = mathActiveQuestion.question;
    $('math-question-area').style.display = 'block';
    $('math-start').textContent = 'استكمال السؤال الحالي';
  } else {
    $('math-difficulty').disabled = false;
    $('math-question-area').style.display = 'none';
    $('math-start').textContent =
      data.remaining > 0 ? 'ابدأ سؤالًا' : 'انتهت محاولات اليوم';
  }

  $('math-start').disabled = data.remaining <= 0 && !mathActiveQuestion;
}

async function loadMathStatus() {
  try {
    const data = await request('/math/status');
    renderMathStatus(data);
  } catch (error) {
    $('math-stats').textContent = error.message;
  }
}

async function startMathQuestion() {
  const button = $('math-start');
  button.disabled = true;
  $('math-message').textContent = '';

  try {
    const data = await request('/math/question', {
      method: 'POST',
      body: JSON.stringify({
        difficulty: $('math-difficulty').value
      })
    });

    mathActiveQuestion = data.question;
    $('math-difficulty').value = data.question.difficulty;
    $('math-difficulty').disabled = true;
    $('math-question').textContent = data.question.question;
    $('math-answer').value = '';
    $('math-question-area').style.display = 'block';
    $('math-answer').focus();
    button.textContent = 'استكمال السؤال الحالي';
  } catch (error) {
    $('math-message').textContent = error.message;
    await loadMathStatus();
  } finally {
    button.disabled = false;
  }
}

async function submitMathAnswer() {
  if (!mathActiveQuestion) return;

  const answer = $('math-answer').value.trim();

  if (!answer) {
    $('math-message').textContent = 'اكتب إجابتك أولًا.';
    return;
  }

  const button = $('math-submit');
  button.disabled = true;

  try {
    const data = await request('/math/answer', {
      method: 'POST',
      body: JSON.stringify({
        challengeId: mathActiveQuestion.challenge_id,
        answer
      })
    });

    const result = data.result;

    $('math-message').textContent = result.correct
      ? `إجابة صحيحة! حصلت على ${result.reward} YNC.`
      : 'إجابة غير صحيحة. لم تحصل على مكافأة، وتم احتساب المحاولة.';

    mathActiveQuestion = null;
    $('math-question-area').style.display = 'none';

    await refresh();
    await loadMathStatus();
  } catch (error) {
    $('math-message').textContent = error.message;
    await loadMathStatus();
  } finally {
    button.disabled = false;
  }
}

$('math-start').addEventListener('click', startMathQuestion);
$('math-submit').addEventListener('click', submitMathAnswer);
