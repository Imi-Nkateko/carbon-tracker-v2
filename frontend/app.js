// API Configuration
const API_URL = 'http://localhost:5000/api';

// Activity data constants
const ACTIVITIES = {
  transport: [
    { name: 'Car (petrol, per km)', co2: 0.21 }, { name: 'Car (diesel, per km)', co2: 0.17 },
    { name: 'Car (electric, per km)', co2: 0.05 }, { name: 'Bus (per km)', co2: 0.089 },
    { name: 'Train (per km)', co2: 0.041 }, { name: 'Flight domestic (per km)', co2: 0.255 },
    { name: 'Flight long-haul (per km)', co2: 0.195 }, { name: 'Motorbike (per km)', co2: 0.114 },
    { name: 'Cycling (per km)', co2: 0 }, { name: 'Walking (per km)', co2: 0 }
  ],
  food: [
    { name: 'Beef (per 100g)', co2: 2.7 }, { name: 'Lamb (per 100g)', co2: 2.45 },
    { name: 'Pork (per 100g)', co2: 0.72 }, { name: 'Chicken (per 100g)', co2: 0.45 },
    { name: 'Fish (per 100g)', co2: 0.34 }, { name: 'Eggs (per egg)', co2: 0.2 },
    { name: 'Milk (per litre)', co2: 0.63 }, { name: 'Cheese (per 100g)', co2: 1.3 },
    { name: 'Rice (per 100g)', co2: 0.27 }, { name: 'Vegetables (per 100g)', co2: 0.04 },
    { name: 'Fruit (per 100g)', co2: 0.06 }
  ],
  energy: [
    { name: 'Electricity (per kWh)', co2: 0.233 }, { name: 'Natural gas (per kWh)', co2: 0.204 },
    { name: 'Home heating oil (per litre)', co2: 2.52 }, { name: 'Coal (per kg)', co2: 2.42 },
    { name: 'Shower (10 min electric)', co2: 0.45 }, { name: 'Washing machine (per cycle)', co2: 0.6 },
    { name: 'Dishwasher (per cycle)', co2: 0.76 }, { name: 'Tumble dryer (per cycle)', co2: 1.8 }
  ],
  other: [
    { name: 'Online shopping (per order)', co2: 0.5 }, { name: 'New clothing item', co2: 10 },
    { name: 'Streaming video (per hour)', co2: 0.036 }, { name: 'Smartphone use (per hour)', co2: 0.007 }
  ]
};

const COMMUNITY_AVG = { transport: 50, food: 22, energy: 12, other: 6 };

const TIPS = {
  transport: [
    'Switch to public transport for commutes — bus travel emits up to 75% less CO₂ per km than a petrol car.',
    'Consider an EV for your next vehicle — electric cars cut tailpipe emissions to zero.',
    'Combine errands into one trip to reduce the number of car journeys per week.'
  ],
  food: [
    'Reducing beef consumption by even 1 meal per week can save ~130 kg CO₂ per year.',
    'Buying local and seasonal produce can cut food transport emissions significantly.',
    'Plant-based protein options like beans or lentils emit up to 80% less CO₂ than beef.'
  ],
  energy: [
    'Switching to renewable electricity tariffs can eliminate most home energy emissions.',
    'Air-drying clothes instead of using a tumble dryer saves ~1.8 kg CO₂ per cycle.',
    'Lowering your thermostat by just 1°C can reduce heating emissions by about 10%.'
  ],
  other: [
    'Buying second-hand clothing instead of new can save 10+ kg CO₂ per item.',
    'Streaming in SD rather than HD reduces video streaming emissions by up to 86%.'
  ]
};

// State management
let state = {
  user: null,
  logs: [],
  filter: 'all',
  token: localStorage.getItem('fp_token')
};

let pieChart = null;
let barChart = null;

// Helper function to update nav active state
function updateNavActive() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.classList.contains('active')) {
      btn.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-900', 'dark:text-gray-100', 'border', 'border-gray-300', 'dark:border-gray-600');
      btn.classList.remove('bg-transparent', 'text-gray-600', 'dark:text-gray-400');
    } else {
      btn.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-900', 'dark:text-gray-100', 'border', 'border-gray-300', 'dark:border-gray-600');
      btn.classList.add('bg-transparent', 'text-gray-600', 'dark:text-gray-400');
    }
  });
}

// API Helper functions
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (state.token) {
    headers['x-auth-token'] = state.token;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

async function loadLogsFromServer() {
  if (!state.token) return;
  try {
    const logs = await apiCall('/logs');
    state.logs = logs;
    saveToLocalCache();
    renderAll();
  } catch (err) {
    console.error('Failed to load logs:', err);
    showToast('Failed to load your data');
  }
}

async function saveLogToServer(log) {
  try {
    await apiCall('/logs', {
      method: 'POST',
      body: JSON.stringify(log)
    });
    return true;
  } catch (err) {
    console.error('Failed to save log:', err);
    showToast('Failed to save activity');
    return false;
  }
}

async function deleteLogFromServer(id) {
  try {
    await apiCall(`/logs/${id}`, {
      method: 'DELETE'
    });
    return true;
  } catch (err) {
    console.error('Failed to delete log:', err);
    showToast('Failed to delete activity');
    return false;
  }
}

function saveToLocalCache() {
  localStorage.setItem('fp_logs_cache', JSON.stringify(state.logs));
}

function loadFromLocalCache() {
  const cached = localStorage.getItem('fp_logs_cache');
  if (cached) {
    try {
      state.logs = JSON.parse(cached);
      renderAll();
    } catch (e) { }
  }
}

function save() {
  saveToLocalCache();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('opacity-100');
  t.classList.remove('opacity-0', 'pointer-events-none');
  setTimeout(() => {
    t.classList.remove('opacity-100');
    t.classList.add('opacity-0', 'pointer-events-none');
  }, 2500);
}

function getDateStr(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function todayLogs() {
  const t = getDateStr();
  return state.logs.filter(l => l.date === t);
}

function weekLogs() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 6);
  return state.logs.filter(l => l.date >= getDateStr(d) && l.date <= getDateStr(now));
}

function monthLogs() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  return state.logs.filter(l => l.date >= getDateStr(d));
}

function totalKg(logs) {
  return logs.reduce((s, l) => s + l.total, 0);
}

function byCategory(logs) {
  const r = { transport: 0, food: 0, energy: 0, other: 0 };
  logs.forEach(l => r[l.cat] = (r[l.cat] || 0) + l.total);
  return r;
}

function filteredLogs() {
  const t = getDateStr();
  const today = state.logs.filter(l => l.date === t);
  return state.filter === 'all' ? today : today.filter(l => l.cat === state.filter);
}

function streak() {
  let s = 0;
  let d = new Date();
  while (true) {
    const ds = getDateStr(d);
    if (state.logs.some(l => l.date === ds)) {
      s++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return s;
}

function populateActivities() {
  const cat = document.getElementById('cat-select').value;
  const sel = document.getElementById('act-select');
  sel.innerHTML = '';
  ACTIVITIES[cat].forEach(a => {
    const o = document.createElement('option');
    o.value = a.co2;
    o.textContent = a.name;
    sel.appendChild(o);
  });
  updateCo2();
}

function updateCo2() {
  const co2 = parseFloat(document.getElementById('act-select').value) || 0;
  const qty = parseFloat(document.getElementById('qty-input').value) || 1;
  document.getElementById('co2-input').value = co2.toFixed(3);
  document.getElementById('calc-total').textContent = (co2 * qty).toFixed(2) + ' kg CO₂';
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function getTagClasses(cat) {
  const classes = {
    food: 'bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    transport: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    energy: 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    other: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
  };
  return classes[cat] || classes.other;
}

function renderActivityList() {
  const list = document.getElementById('activity-list');
  const logs = filteredLogs();
  if (!logs.length) {
    list.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">No activities for this filter yet</div>';
    return;
  }
  list.innerHTML = logs.map(l => `
    <div class="flex items-center gap-2.5 py-2.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getTagClasses(l.cat)}">${l.cat}</span>
      <span class="flex-1 text-sm">${escapeHtml(l.name)}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400">×${l.qty}</span>
      <span class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[70px] text-right">${l.total.toFixed(2)} kg</span>
      <button class="del-btn bg-transparent border-none cursor-pointer text-gray-400 dark:text-gray-500 text-base px-2 py-0.5 rounded hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800" onclick="deleteLog('${l.id}')">×</button>
    </div>`).join('');
}

async function deleteLog(id) {
  const success = await deleteLogFromServer(id);
  if (success) {
    state.logs = state.logs.filter(l => l.id !== id);
    save();
    renderAll();
    showToast('Activity removed');
  }
}

function renderMetrics() {
  document.getElementById('m-today').textContent = totalKg(todayLogs()).toFixed(1);
  document.getElementById('m-week').textContent = totalKg(weekLogs()).toFixed(1);
  document.getElementById('m-month').textContent = totalKg(monthLogs()).toFixed(1);
  document.getElementById('m-count').textContent = state.logs.length;
}

function renderDashboard() {
  const all = state.logs;
  const wk = weekLogs();
  document.getElementById('d-total').textContent = totalKg(all).toFixed(1);
  const wkTotal = totalKg(wk);
  document.getElementById('d-goal-pct').textContent = Math.min(Math.round(wkTotal / 70 * 100), 999) + '%';
  document.getElementById('streak-count').textContent = streak();

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const dayData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = getDateStr(d);
    const tot = totalKg(state.logs.filter(l => l.date === ds));
    dayData.push({ day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], val: tot });
  }
  const maxDay = Math.max(...dayData.map(d => d.val), 1);
  document.getElementById('week-bars').innerHTML = dayData.map(d => `
    <div class="week-day flex-1 text-center">
      <div class="week-day-label text-xs text-gray-500 dark:text-gray-400 mb-1">${d.day}</div>
      <div class="week-day-bar-wrap h-15 flex items-end justify-center"><div class="week-day-bar w-6 rounded-t bg-emerald-600" style="height:${Math.round(d.val / maxDay * 60)}px"></div></div>
      <div class="week-day-val text-xs text-gray-600 dark:text-gray-400 mt-1">${d.val.toFixed(1)}</div>
    </div>`).join('');

  const cat = byCategory(wk);
  const cats = Object.keys(cat);
  const vals = cats.map(c => cat[c]);
  const colors = ['#378ADD', '#1D9E75', '#EF9F27', '#888780'];
  const catLabels = { transport: 'Transport', food: 'Food', energy: 'Energy', other: 'Other' };

  if (pieChart) { pieChart.destroy(); pieChart = null; }
  const pieCvs = document.getElementById('pieChart');
  if (vals.some(v => v > 0)) {
    pieChart = new Chart(pieCvs, {
      type: 'pie',
      data: { labels: cats.map(c => catLabels[c]), datasets: [{ data: vals, backgroundColor: colors, borderWidth: 1, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }
  document.getElementById('pie-legend').innerHTML = cats.map((c, i) => `<span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm" style="background:${colors[i]}"></span>${catLabels[c]}: ${cat[c].toFixed(1)} kg</span>`).join('');

  const comp = document.getElementById('comparison-view');
  comp.innerHTML = cats.map((c, i) => {
    const myVal = cat[c];
    const avg = COMMUNITY_AVG[c];
    const maxW = Math.max(myVal, avg, 1);
    const badge = myVal <= avg
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">below avg</span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">above avg</span>`;
    return `<div class="mb-2.5">
      <div class="flex justify-between items-center mb-0.5">
        <span class="text-xs font-medium">${catLabels[c]}</span>${badge}
      </div>
      <div class="comparison-bar relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full my-1 overflow-visible">
        <div class="comp-fill h-full rounded-full bg-emerald-600" style="width:${Math.round(myVal / maxW * 100)}%"></div>
        <div class="comp-avg-line absolute -top-0.5 h-4 w-0.5 bg-red-500 rounded-sm" style="left:${Math.round(avg / maxW * 100)}%;"></div>
      </div>
      <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>You: ${myVal.toFixed(1)} kg</span><span class="text-red-600 dark:text-red-400">Avg: ${avg} kg</span></div>
    </div>`;
  }).join('');
}

function renderInsights() {
  const wk = weekLogs();
  const cat = byCategory(wk);
  const sorted = Object.entries(cat).sort((a, b) => b[1] - a[1]);
  const topSrc = document.getElementById('top-sources');
  const total = totalKg(wk) || 1;
  const catLabels = { transport: 'Transport', food: 'Food', energy: 'Energy', other: 'Other' };
  const colors = { transport: '#378ADD', food: '#1D9E75', energy: '#EF9F27', other: '#888780' };

  topSrc.innerHTML = sorted.map(([c, v]) => `
    <div class="mb-3">
      <div class="flex justify-between mb-1">
        <span class="text-sm font-medium">${catLabels[c]}</span>
        <span class="text-sm text-gray-600 dark:text-gray-400">${v.toFixed(1)} kg (${Math.round(v / total * 100)}%)</span>
      </div>
      <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div class="progress-fill h-full rounded-full" style="width:${Math.round(v / total * 100)}%;background:${colors[c]}"></div></div>
    </div>`).join('');

  const tipsEl = document.getElementById('tips-list');
  const topCat = sorted[0] ? sorted[0][0] : 'transport';
  const allTips = [...(TIPS[topCat] || []), ...(sorted[1] ? TIPS[sorted[1][0]] || [] : [])];
  tipsEl.innerHTML = allTips.slice(0, 4).map(t => `<div class="tip-card bg-gray-100 dark:bg-gray-800 rounded-lg p-3.5 border-l-4 border-emerald-600 mb-3"><span class="tip-icon inline-block mr-2">🌱</span><span class="tip-text text-sm text-gray-900 dark:text-gray-100">${t}</span></div>`).join('');
  if (!allTips.length) tipsEl.innerHTML = '<div class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">Log activities to get personalised tips</div>';

  const goalEl = document.getElementById('goal-tracker');
  const weekGoal = 70;
  const wkTotal = totalKg(wk);
  const pct = Math.min(wkTotal / weekGoal * 100, 100);
  const remaining = Math.max(weekGoal - wkTotal, 0);
  const barColor = pct > 100 ? '#E24B4A' : pct > 80 ? '#EF9F27' : '#1D9E75';
  goalEl.innerHTML = `
    <div class="flex justify-between mb-1.5">
      <span class="text-sm">Weekly budget: <strong>${weekGoal} kg CO₂</strong></span>
      <span class="text-sm text-gray-600 dark:text-gray-400">${wkTotal.toFixed(1)} used</span>
    </div>
    <div class="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div class="progress-fill h-full rounded-full" style="width:${Math.round(pct)}%;background:${barColor}"></div></div>
    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1.5">${remaining > 0 ? `${remaining.toFixed(1)} kg remaining this week` : 'Weekly goal exceeded — try to reduce activities next week'}</div>`;

  if (barChart) { barChart.destroy(); barChart = null; }
  const barCvs = document.getElementById('barChart');
  barChart = new Chart(barCvs, {
    type: 'bar',
    data: {
      labels: sorted.map(([c]) => catLabels[c]),
      datasets: [{
        label: 'Your emissions',
        data: sorted.map(([, v]) => parseFloat(v.toFixed(2))),
        backgroundColor: sorted.map(([c]) => colors[c]),
        borderWidth: 0,
        borderRadius: 4
      }, {
        label: 'Community avg',
        data: sorted.map(([c]) => COMMUNITY_AVG[c] || 0),
        backgroundColor: 'rgba(136,135,128,0.25)',
        borderColor: '#888780',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' kg' } } }
    }
  });
}

// Authentication functions
async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value;

  if (!name || !email || !password) {
    showToast('Please fill all fields');
    return;
  }

  try {
    const data = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('fp_token', state.token);
    localStorage.setItem('fp_current_user', JSON.stringify(state.user));

    updateUserUI();
    renderAuthPanel();
    await loadLogsFromServer();
    showToast('Account created! Welcome ' + name);
  } catch (err) {
    showToast(err.message);
  }
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-pass').value;

  try {
    const data = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('fp_token', state.token);
    localStorage.setItem('fp_current_user', JSON.stringify(state.user));

    updateUserUI();
    renderAuthPanel();
    await loadLogsFromServer();
    showToast('Welcome back, ' + state.user.name + '!');
  } catch (err) {
    showToast(err.message);
  }
}

function logout() {
  state.user = null;
  state.token = null;
  state.logs = [];
  localStorage.removeItem('fp_token');
  localStorage.removeItem('fp_current_user');
  updateUserUI();
  renderAuthPanel();
  renderAll();
  showToast('Signed out');
}

function updateUserUI() {
  const pill = document.getElementById('user-pill');
  const btn = document.getElementById('auth-toggle-btn');
  if (state.user) {
    pill.classList.remove('hidden');
    pill.classList.add('flex');
    document.getElementById('user-name-display').textContent = state.user.name.split(' ')[0];
    document.getElementById('avatar-circle').textContent = state.user.name.slice(0, 2).toUpperCase();
    document.getElementById('user-subtitle').textContent = 'Logged in as ' + state.user.name;
    btn.textContent = 'Account';
    btn.onclick = () => switchPage('account');
  } else {
    pill.classList.add('hidden');
    pill.classList.remove('flex');
    document.getElementById('user-subtitle').textContent = 'Track your daily carbon emissions';
    btn.textContent = 'Sign in';
    btn.onclick = () => switchPage('account');
  }
}

function renderAuthPanel() {
  const panel = document.getElementById('auth-panel');
  if (state.user) {
    panel.innerHTML = `
      <div class="max-w-md mx-auto mt-12">
        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <div class="w-14 h-14 rounded-full bg-emerald-600 mx-auto mb-4 flex items-center justify-center text-xl font-medium text-white">${state.user.name.slice(0, 2).toUpperCase()}</div>
          <div class="text-lg font-medium mb-1">${escapeHtml(state.user.name)}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-6">${state.user.email}</div>
          <div class="grid grid-cols-2 gap-3 text-left mb-6">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Member since</div>
              <div class="text-base font-medium">${state.user.joined}</div>
            </div>
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div class="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Total activities</div>
              <div class="text-base font-medium">${state.logs.length}</div>
            </div>
          </div>
          <button class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150" onclick="logout()">Sign out</button>
        </div>
      </div>`;
  } else {
    panel.innerHTML = `
      <div class="max-w-md mx-auto mt-12">
        <div id="auth-mode-register">
          <div class="text-lg font-medium mb-6">Create account</div>
          <div class="mb-2.5"><div class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Name</div><input class="input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-600" id="reg-name" placeholder="Your name"></div>
          <div class="mb-2.5"><div class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Email</div><input class="input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-600" id="reg-email" type="email" placeholder="email@example.com"></div>
          <div class="mb-5"><div class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Password</div><input class="input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-600" id="reg-pass" type="password" placeholder="Choose a password"></div>
          <button class="w-full px-4 py-2 border border-emerald-600 rounded-lg bg-emerald-600 text-white cursor-pointer text-sm font-medium hover:bg-emerald-700 transition-all duration-150 mb-2.5" onclick="register()">Create account</button>
          <div class="divider text-center text-gray-500 dark:text-gray-400 text-sm relative my-4"><span class="px-2 bg-white dark:bg-gray-900 relative z-10">or</span><div class="absolute left-0 right-0 top-1/2 h-px bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div></div>
          <button class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150" onclick="showLogin()">Sign in to existing account</button>
        </div>
        <div id="auth-mode-login" class="hidden">
          <div class="text-lg font-medium mb-6">Sign in</div>
          <div class="mb-2.5"><div class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Email</div><input class="input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-600" id="login-email" type="email" placeholder="email@example.com"></div>
          <div class="mb-5"><div class="text-xs text-gray-600 dark:text-gray-400 mb-1.5">Password</div><input class="input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:border-emerald-600" id="login-pass" type="password" placeholder="Your password"></div>
          <button class="w-full px-4 py-2 border border-emerald-600 rounded-lg bg-emerald-600 text-white cursor-pointer text-sm font-medium hover:bg-emerald-700 transition-all duration-150 mb-2.5" onclick="login()">Sign in</button>
          <div class="divider text-center text-gray-500 dark:text-gray-400 text-sm relative my-4"><span class="px-2 bg-white dark:bg-gray-900 relative z-10">or</span><div class="absolute left-0 right-0 top-1/2 h-px bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div></div>
          <button class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150" onclick="showRegister()">Create new account</button>
        </div>
      </div>`;
  }
}

function showLogin() {
  document.getElementById('auth-mode-register').classList.add('hidden');
  document.getElementById('auth-mode-login').classList.remove('hidden');
}

function showRegister() {
  document.getElementById('auth-mode-login').classList.add('hidden');
  document.getElementById('auth-mode-register').classList.remove('hidden');
}

function renderAll() {
  renderActivityList();
  renderMetrics();
  renderDashboard();
  renderInsights();
}

function switchPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-white', 'dark:bg-gray-900', 'text-gray-900', 'dark:text-gray-100', 'border', 'border-gray-300', 'dark:border-gray-600'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.add('bg-transparent', 'text-gray-600', 'dark:text-gray-400'));

  document.getElementById('page-' + name).classList.remove('hidden');
  const activeBtn = document.querySelector(`.nav-btn[data-page="${name}"]`);
  activeBtn.classList.add('active', 'bg-white', 'dark:bg-gray-900', 'text-gray-900', 'dark:text-gray-100', 'border', 'border-gray-300', 'dark:border-gray-600');
  activeBtn.classList.remove('bg-transparent', 'text-gray-600', 'dark:text-gray-400');

  if (name === 'dashboard') renderDashboard();
  if (name === 'insights') renderInsights();
  if (name === 'account') renderAuthPanel();
}

// Event listeners
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchPage(b.dataset.page)));
document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {
  state.filter = b.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach(x => {
    x.classList.remove('active', 'bg-emerald-600', 'text-white', 'border-emerald-600');
    x.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-600', 'dark:text-gray-400');
  });
  b.classList.add('active', 'bg-emerald-600', 'text-white', 'border-emerald-600');
  b.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-600', 'dark:text-gray-400');
  renderActivityList();
}));

document.getElementById('cat-select').addEventListener('change', populateActivities);
document.getElementById('act-select').addEventListener('change', updateCo2);
document.getElementById('qty-input').addEventListener('input', updateCo2);

document.getElementById('add-btn').addEventListener('click', async () => {
  if (!state.user) {
    showToast('Please sign in to log activities');
    switchPage('account');
    return;
  }

  const cat = document.getElementById('cat-select').value;
  const actSel = document.getElementById('act-select');
  const name = actSel.options[actSel.selectedIndex].text;
  const co2 = parseFloat(document.getElementById('co2-input').value) || 0;
  const qty = parseFloat(document.getElementById('qty-input').value) || 1;
  const total = parseFloat((co2 * qty).toFixed(3));
  const log = { id: Date.now().toString(), cat, name, co2, qty, total, date: getDateStr() };

  const success = await saveLogToServer(log);
  if (success) {
    state.logs.push(log);
    save();
    renderAll();
    showToast('Added: ' + total.toFixed(2) + ' kg CO₂');
  }
});

document.getElementById('auth-toggle-btn').onclick = () => switchPage('account');

// Initialize app
const savedUser = localStorage.getItem('fp_current_user');
if (savedUser) {
  try {
    state.user = JSON.parse(savedUser);
    updateUserUI();
    loadFromLocalCache();
    loadLogsFromServer();
  } catch (e) { }
}

populateActivities();
renderAll();
renderAuthPanel();

// Demo data for new users
if (state.user && state.logs.length === 0) {
  const demos = [
    { id: 'd1', cat: 'transport', name: 'Car (petrol, per km)', co2: 0.21, qty: 15, total: 3.15, date: getDateStr() },
    { id: 'd2', cat: 'food', name: 'Beef (per 100g)', co2: 2.7, qty: 2, total: 5.4, date: getDateStr() },
    { id: 'd3', cat: 'energy', name: 'Electricity (per kWh)', co2: 0.233, qty: 8, total: 1.864, date: getDateStr() }
  ];
  const d1 = new Date();
  d1.setDate(d1.getDate() - 1);
  demos.push({ id: 'd4', cat: 'transport', name: 'Bus (per km)', co2: 0.089, qty: 10, total: 0.89, date: getDateStr(d1) });
  const d2 = new Date();
  d2.setDate(d2.getDate() - 2);
  demos.push({ id: 'd5', cat: 'food', name: 'Chicken (per 100g)', co2: 0.45, qty: 3, total: 1.35, date: getDateStr(d2) });

  Promise.all(demos.map(log => saveLogToServer(log))).then(() => {
    loadLogsFromServer();
  });
}
