const publicSite = document.getElementById('publicSite');
const appView = document.getElementById('appView');
const footer = document.querySelector('.site-footer');
const toastEl = document.getElementById('toast');
let currentView = 'home';
let toastTimer;

// If a deployed full-stack demo URL is configured (see <meta name="veltrix-app-url">),
// route the sign-in / registration / dashboard calls to it. Otherwise the static
// in-page preview is used, exactly as before.
const APP_URL = (document.querySelector('meta[name="veltrix-app-url"]')?.content || '').replace(/\/+$/, '');
const APP_PATHS = {
  login: '/login', register: '/register', forgot: '/login',
  portal: '/dashboard', markets: '/markets', portfolio: '/portfolio',
  accounts: '/portfolio', wallet: '/portfolio', deposits: '/portfolio',
  withdrawals: '/portfolio', transactions: '/transactions',
  kyc: '/dashboard', settings: '/dashboard', 'portal-support': '/support'
};
function appUrlFor(view) {
  if (!APP_URL) return null;
  if (view === 'admin' || view.startsWith('admin-')) return `${APP_URL}/admin/`;
  return APP_PATHS[view] ? `${APP_URL}${APP_PATHS[view]}` : null;
}

const marketRows = [
  ['EUR/USD','Euro / US Dollar','1.0842','+0.18%','positive','€'],
  ['BTC/USD','Bitcoin / US Dollar','$67,420','+1.42%','positive','₿'],
  ['XAU/USD','Gold / US Dollar','$2,356.80','−0.24%','negative','Au'],
  ['NAS100','Nasdaq 100','18,214.6','+0.62%','positive','↗'],
  ['GBP/USD','British Pound / US Dollar','1.2716','+0.08%','positive','£']
];
const transactions = [
  ['Sample deposit','Demo account','2026-10-07','$1,000.00','pending'],
  ['Demo purchase','BTC/USD','2026-10-05','$250.00','review'],
  ['Sample withdrawal','Demo account','2026-10-02','$120.00','pending'],
  ['Demo adjustment','Portfolio','2026-09-29','$75.00','review']
];
const navItems = [
  ['Overview','portal','⌂','WORKSPACE'],
  ['Markets','markets','◫','WORKSPACE'],
  ['Portfolio','portfolio','◈','WORKSPACE'],
  ['Accounts','accounts','▣','WORKSPACE'],
  ['Wallet','wallet','◇','MONEY TOOLS'],
  ['Deposits','deposits','↓','MONEY TOOLS'],
  ['Withdrawals','withdrawals','↑','MONEY TOOLS'],
  ['Transactions','transactions','≡','MONEY TOOLS'],
  ['Verification','kyc','✓','ACCOUNT'],
  ['Support','portal-support','✳','ACCOUNT'],
  ['Settings','settings','⚙','ACCOUNT']
];
const adminItems = [
  ['Overview','admin','⌂','OPERATIONS'],
  ['Customers','admin-customers','♙','OPERATIONS'],
  ['Verification','admin-kyc','✓','OPERATIONS'],
  ['Transactions','admin-transactions','≡','OPERATIONS'],
  ['Support inbox','admin-support','✳','OPERATIONS'],
  ['Audit logs','admin-audit','◷','SYSTEM']
];
function showToast(message) {
  toastEl.textContent = message; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}
function go(view) {
  currentView = view;
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('mobileToggle').setAttribute('aria-expanded','false');
  if (view === 'home') {
    publicSite.classList.remove('hidden'); appView.classList.add('hidden'); footer.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'}); return;
  }
  publicSite.classList.add('hidden'); appView.classList.remove('hidden'); footer.classList.add('hidden');
  renderView(view); window.scrollTo({top:0,behavior:'smooth'});
}
function sidebar(active, admin=false) {
  const items = admin ? adminItems : navItems;
  let last = '';
  return `<aside class="app-sidebar"><a class="brand" href="#" data-view="home"><span class="brand-mark">V</span><span>VELTRIX</span></a>${items.map(([label,view,icon,group])=>{
    const groupLabel = group !== last ? `<div class="sidebar-title">${group}</div>` : ''; last = group;
    return `${groupLabel}<button class="side-link ${active===view?'active':''}" data-view="${view}"><span class="nav-icon">${icon}</span>${label}</button>`;
  }).join('')}<div class="sidebar-title">DEMO ACCOUNT</div><button class="side-link" data-view="login"><span class="nav-icon">↪</span>Sign out preview</button></aside>`;
}
function shell(view, title, subtitle, body, admin=false) {
  return `<div class="app-shell">${sidebar(view,admin)}<section class="app-main"><div class="app-topline"><div><h1>${title}</h1><p>${subtitle}</p></div><span class="demo-chip">● DEMO MODE</span></div>${body}</section></div>`;
}
function table(rows, headings) {
  return `<div class="table-scroll"><table class="data-table"><thead><tr>${headings.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td>${i===r.length-1 && ['pending','review'].includes(v)?`<span class="status ${v}">${v==='pending'?'Pending':'Demo'}</span>`:v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function marketTable() {
  return `<div class="app-card"><div class="section-row"><div><h3>Market watch</h3><div class="muted-copy">Illustrative values, not executable quotes.</div></div><input id="marketSearch" placeholder="Search markets…" aria-label="Search markets" style="max-width:180px;background:#08110f;color:#fff;border:1px solid #2b4135;padding:10px;font:11px var(--font)"></div><div id="marketTable">${renderMarkets(marketRows)}</div><div class="mobile-note">Swipe horizontally to view all columns.</div></div>`;
}
function renderMarkets(rows) {
  return table(rows.map(r=>[`<span class="asset-symbol"><span class="asset-badge">${r[5]}</span><span><b>${r[0]}</b><br><span style="color:#718779;font-size:9px">${r[1]}</span></span></span>`,r[2],`<span class="${r[4]}">${r[3]}</span>`,`<button class="btn btn-outline" style="padding:6px 9px" data-toast="Demo market action only">View</button>`]),['INSTRUMENT','DEMO PRICE','CHANGE','ACTION']);
}
function overviewBody() {
  return `<div class="admin-warn">All figures and activity below are simulated examples. No funds are held, and no trades or transactions can be executed.</div>
  <div class="stat-grid"><div class="app-card"><span class="stat-label">DEMO PORTFOLIO</span><div class="stat-value">$24,680.50</div><span class="stat-change">↗ +4.28% illustrative</span></div><div class="app-card"><span class="stat-label">AVAILABLE BALANCE</span><div class="stat-value">$8,240.00</div><span class="muted-copy">Simulated value</span></div><div class="app-card"><span class="stat-label">WATCHLIST</span><div class="stat-value">08</div><span class="muted-copy">Sample instruments</span></div></div>
  <div class="dashboard-grid"><div class="app-card"><div class="section-row"><div><h3>Portfolio overview</h3><div class="muted-copy">Illustrative movement over time</div></div><span class="status">DEMO</span></div><svg class="mini-chart" viewBox="0 0 500 190" preserveAspectRatio="none" aria-label="Illustrative portfolio chart"><g stroke="#ffffff0e"><path d="M0 30H500M0 70H500M0 110H500M0 150H500"/></g><path d="M0 150 C35 142 45 118 80 132 S120 80 155 102 S195 115 225 70 S275 96 310 56 S350 73 390 42 S450 55 500 18" fill="none" stroke="#8be3b5" stroke-width="3"/></svg><div class="chart-axis"><span>SEP 01</span><span>SEP 10</span><span>SEP 20</span><span>OCT 01</span><span>OCT 09</span></div></div>
  <div class="app-card"><h3>Allocation preview</h3><div class="muted-copy">Sample portfolio composition</div><div class="allocation"><div class="donut"></div><div class="legend"><span>Crypto · 42%</span><span>Indices · 26%</span><span>Commodities · 18%</span><span>Other · 14%</span></div></div></div></div>
  <div class="app-card" style="margin-top:15px"><div class="section-row"><div><h3>Market watch</h3><div class="muted-copy">Demo prices only</div></div><button class="btn btn-outline" data-view="markets">All markets ↗</button></div>${renderMarkets(marketRows.slice(0,4))}</div>`;
}
function authView(register=false) {
  const title = register ? 'Create your account' : 'Welcome back';
  const desc = register ? 'Explore the VELTRIX demo experience.' : 'Sign in to preview your workspace.';
  return `<div class="back-link" data-view="home">← Back to VELTRIX</div><form class="form-card" id="authForm"><div class="eyebrow"><span class="eyebrow-line"></span> VELTRIX DEMO</div><h2>${title}</h2><p>${desc}</p>${register?`<div class="form-group"><label for="fullName">Full name</label><input id="fullName" required placeholder="Your name" autocomplete="name"></div>`:''}<div class="form-group"><label for="email">Email address</label><input id="email" type="email" required placeholder="you@example.com" autocomplete="email"></div><div class="form-group"><label for="password">Password</label><input id="password" type="password" required minlength="8" placeholder="At least 8 characters" autocomplete="${register?'new-password':'current-password'}"></div>${register?`<label style="font-size:10px;color:#9aada0;display:flex;gap:9px;align-items:flex-start"><input type="checkbox" required style="margin-top:3px"> I agree to the demo terms and privacy notice.</label>`:`<div style="text-align:right"><button type="button" class="text-link" data-view="forgot" style="background:none;border:0">Forgot password?</button></div>`}<button class="btn btn-primary" type="submit">${register?'Create demo account':'Sign in to demo'} <span>↗</span></button><div class="form-note">Demo only. This form does not create an account, authenticate a user, send email, or store your credentials. Do not enter a real password.</div><div class="auth-switch">${register?'Already exploring?':'New to VELTRIX?'} <button type="button" data-view="${register?'login':'register'}">${register?'Log in preview':'Create a demo account'}</button></div></form>`;
}
function contentFor(view) {
  switch(view) {
    case 'portal': return shell(view,'Good morning.','Here’s your demo workspace at a glance.',overviewBody());
    case 'markets': return shell(view,'Markets','Explore a sample set of instruments and illustrative prices.',marketTable());
    case 'portfolio': return shell(view,'Portfolio','A visual preview of how portfolio information could be presented.',`<div class="admin-warn">This is simulated portfolio information, not a record of real assets.</div><div class="page-grid"><div class="app-card"><span class="stat-label">DEMO PORTFOLIO VALUE</span><div class="stat-value">$24,680.50</div><span class="stat-change">+4.28% illustrative</span><div class="allocation"><div class="donut"></div><div class="legend"><span>Crypto · 42%</span><span>Indices · 26%</span><span>Commodities · 18%</span><span>Other · 14%</span></div></div></div><div class="app-card"><h3>Portfolio notes</h3><p class="muted-copy">A real portfolio view would be populated from authenticated, permission-checked backend data and a reliable valuation service.</p></div></div>`);
    case 'accounts': return shell(view,'Accounts','Manage account profiles in this demo.',`<div class="page-grid"><div class="app-card"><span class="stat-label">ACCOUNT 001 · SAMPLE</span><h3 style="font-size:22px;margin-top:14px">Essential</h3><p class="muted-copy">Status: demo account</p><div class="stat-value">$10,000.00</div><span class="status">Demo active</span></div><div class="app-card"><span class="stat-label">ACCOUNT 002 · SAMPLE</span><h3 style="font-size:22px;margin-top:14px">Advanced</h3><p class="muted-copy">Status: preview only</p><div class="stat-value">$14,680.50</div><span class="status pending">Preview</span></div></div><div class="app-actions"><button class="btn btn-primary" data-toast="Account creation is not connected in this demo">＋ Add account preview</button></div>`);
    case 'wallet': case 'deposits': case 'withdrawals': return shell(view,({wallet:'Wallet',deposits:'Deposits',withdrawals:'Withdrawals'})[view], 'Demo financial interfaces — no money movement is available.',`<div class="admin-warn">Do not enter payment details. These are interface previews only; no funds can be received, held, or sent.</div><div class="stat-grid"><div class="app-card"><span class="stat-label">DEMO BALANCE</span><div class="stat-value">$8,240.00</div><span class="muted-copy">Simulated only</span></div><div class="app-card"><span class="stat-label">PENDING ITEMS</span><div class="stat-value">02</div><span class="muted-copy">Sample records</span></div></div><div class="app-card"><h3>${view==='withdrawals'?'Withdrawal request preview':view==='deposits'?'Deposit method preview':'Wallet activity'}</h3><p class="muted-copy">A production flow requires authenticated server-side authorization, a verified payment provider, ledger controls, reconciliation, and audit logging.</p><div class="app-actions"><button class="btn btn-primary" data-toast="Demo only — no transaction was created">Preview action</button><button class="btn btn-outline" data-view="transactions">View activity</button></div></div>`);
    case 'transactions': return shell(view,'Transactions','Sample transaction history for layout preview.',`<div class="admin-warn">These records are fictional demo entries. They are not financial transactions.</div><div class="app-card">${table(transactions.map(t=>[t[0],t[1],t[2],t[3],t[4]]),['ACTIVITY','DETAIL','DATE','AMOUNT','STATUS'])}<div class="mobile-note">Swipe horizontally to view all columns.</div></div>`);
    case 'kyc': return shell(view,'Verification','Preview an identity verification workflow.',`<div class="admin-warn">Do not upload real identity documents. This demo does not transmit or securely store files.</div><div class="app-card"><span class="status pending">Not submitted</span><h3 style="font-size:21px;margin-top:18px">Verify your identity</h3><p class="muted-copy">A production service would explain required documents, collect consent, securely transfer files, and provide a review status.</p><form id="kycForm"><div class="form-group"><label>Country of residence</label><select required><option value="">Choose a country</option><option>Nigeria</option><option>United Kingdom</option><option>Other</option></select></div><div class="form-group"><label>Document type</label><select required><option value="">Select a document</option><option>Government-issued ID</option><option>Passport</option><option>Proof of address</option></select></div><div class="form-group"><label>Sample file selection (not uploaded)</label><input type="file" accept=".pdf,.png,.jpg,.jpeg"></div><button class="btn btn-primary" type="submit">Preview verification step</button></form></div>`);
    case 'portal-support': return shell(view,'Support centre','A sample support conversation. No real ticket will be sent.',`<div class="admin-warn">This inbox is a UI demo. Messages are not delivered to a human agent.</div><div class="app-card"><div class="section-row"><div><h3>Conversation preview</h3><div class="muted-copy">Sample ticket #VX-1042 · Demo</div></div><span class="status">Open demo</span></div><div class="support-thread"><div class="chat-bubble"><span class="chat-meta">VELTRIX SUPPORT · SAMPLE</span>Hello! Welcome to the demo support centre. How can we help you today?</div><div class="chat-bubble agent"><span class="chat-meta">YOU · EXAMPLE</span>I’d like to understand how account verification works.</div><div class="chat-bubble"><span class="chat-meta">VELTRIX SUPPORT · SAMPLE</span>A real support team would explain the steps and provide status updates here.</div></div><form id="supportForm"><div class="form-group"><label for="supportMessage">Your message</label><textarea id="supportMessage" rows="3" required placeholder="Write a sample message…"></textarea></div><button class="btn btn-primary" type="submit">Preview reply</button></form></div>`);
    case 'settings': return shell(view,'Settings','Preview profile and notification preferences.',`<div class="app-card"><h3>Profile preferences</h3><form id="settingsForm"><div class="form-group"><label>Display name</label><input placeholder="Demo user"></div><div class="form-group"><label>Notification preference</label><select><option>Important updates</option><option>All notifications</option><option>Essential only</option></select></div><button class="btn btn-primary" type="submit">Preview settings</button></form><p class="form-note">Settings are not saved to an account or server in this prototype.</p></div>`);
    case 'forgot': return `<div class="back-link" data-view="login">← Back to login</div><form class="form-card" id="forgotForm"><div class="eyebrow"><span class="eyebrow-line"></span> ACCOUNT HELP</div><h2>Reset your password</h2><p>Enter an email to preview the recovery flow.</p><div class="form-group"><label>Email address</label><input type="email" required placeholder="you@example.com"></div><button class="btn btn-primary" type="submit">Preview recovery</button><div class="form-note">No email will be sent. Real password recovery requires a secure authentication service.</div></form>`;
    case 'admin': return shell(view,'Operations overview','A sample control centre for internal teams.',`<div class="admin-warn">Admin data is fictional. Frontend navigation is not access control; real permissions must be enforced on the server.</div><div class="stat-grid"><div class="app-card"><span class="stat-label">SAMPLE CUSTOMERS</span><div class="stat-value">1,284</div><span class="muted-copy">Illustrative only</span></div><div class="app-card"><span class="stat-label">REVIEWS QUEUED</span><div class="stat-value">18</div><span class="muted-copy">Sample queue</span></div><div class="app-card"><span class="stat-label">OPEN DEMO TICKETS</span><div class="stat-value">07</div><span class="muted-copy">Sample records</span></div></div><div class="page-grid"><div class="app-card"><h3>Verification queue</h3><p class="muted-copy">18 sample reviews await attention.</p><button class="btn btn-outline" data-view="admin-kyc">Review demo queue ↗</button></div><div class="app-card"><h3>Support inbox</h3><p class="muted-copy">7 sample tickets in the demo queue.</p><button class="btn btn-outline" data-view="admin-support">Open demo inbox ↗</button></div></div>`,true);
    case 'admin-customers': return shell(view,'Customers','Sample customer records for layout testing.',`<div class="admin-warn">Fictional records only. Do not use this screen for real customer information.</div><div class="app-card">${table([['VX-001','Alex Morgan','alex@example.test','Verified'],['VX-002','Jamie Lee','jamie@example.test','Pending'],['VX-003','Taylor Reed','taylor@example.test','Review']].map(r=>[r[0],r[1],r[2],`<span class="status ${r[3]==='Verified'?'':r[3]==='Pending'?'pending':'review'}">${r[3]}</span>`]),['REFERENCE','CUSTOMER','DEMO EMAIL','STATUS'])}</div>`,true);
    case 'admin-kyc': return shell(view,'Verification review','A sample queue for identity-review workflows.',`<div class="admin-warn">No real documents or identity records are available in this prototype.</div><div class="app-card">${table([['VX-002','Jamie Lee','2026-10-08','Pending'],['VX-007','Robin Park','2026-10-08','Review'],['VX-013','Sam River','2026-10-07','Pending']].map(r=>[r[0],r[1],r[2],`<span class="status ${r[3]==='Pending'?'pending':'review'}">${r[3]}</span>`]),['REFERENCE','SAMPLE CUSTOMER','DATE','STATUS'])}<div class="app-actions"><button class="btn btn-outline" data-toast="Document review is not connected">Preview review action</button></div></div>`,true);
    case 'admin-transactions': return shell(view,'Transaction monitoring','Sample records and statuses only.',`<div class="admin-warn">No real payment or transaction provider is connected.</div><div class="app-card">${table(transactions.map(t=>[t[0],t[1],t[2],t[3],`<span class="status ${t[4]}">${t[4]==='pending'?'Pending':'Demo'}</span>`]),['ACTIVITY','REFERENCE','DATE','VALUE','STATUS'])}</div>`,true);
    case 'admin-support': return shell(view,'Support inbox','Preview customer-support operations and ticket handling.',`<div class="admin-warn">Sample tickets only. Replies will not reach real customers or support agents.</div><div class="app-card">${table([['VX-1042','Verification question','Normal','Open'],['VX-1043','Account access','High','Open'],['VX-1044','General enquiry','Low','Pending']].map(r=>[r[0],r[1],r[2],`<span class="status ${r[3]==='Pending'?'pending':''}">${r[3]}</span>`]),['TICKET','SUBJECT','PRIORITY','STATUS'])}<div class="app-actions"><button class="btn btn-primary" data-toast="Sample ticket opened in preview mode">Open selected demo ticket</button></div></div>`,true);
    case 'admin-audit': return shell(view,'Audit logs','Illustrative system activity; not a real audit trail.',`<div class="admin-warn">These are examples, not security-grade audit records. Production audit logs must be generated and protected server-side.</div><div class="app-card">${table([['2026-10-09 09:42','Demo admin','Viewed dashboard'],['2026-10-09 09:38','Sample reviewer','Opened review queue'],['2026-10-08 16:14','Demo support','Viewed ticket']].map(r=>r),['TIMESTAMP','SAMPLE ACTOR','EVENT'])}</div>`,true);
    default: return authView(view==='register');
  }
}
function renderView(view) {
  if (view==='login' || view==='register' || view==='forgot') {
    appView.innerHTML = `<div class="section-wrap">${contentFor(view)}</div>`;
  } else if (view==='portal-support' || view.startsWith('admin') || ['portal','markets','portfolio','accounts','wallet','deposits','withdrawals','transactions','kyc','settings'].includes(view)) {
    appView.innerHTML = contentFor(view);
  } else {
    appView.innerHTML = `<div class="section-wrap">${authView(false)}</div>`;
  }
}
document.addEventListener('click', e => {
  const viewEl = e.target.closest('[data-view]');
  if (viewEl) {
    e.preventDefault();
    const external = appUrlFor(viewEl.dataset.view);
    if (external) { window.location.href = external; return; }
    go(viewEl.dataset.view); return;
  }
  const toastButton = e.target.closest('[data-toast]');
  if (toastButton) { e.preventDefault(); showToast(toastButton.dataset.toast); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id==='authForm') showToast('Demo only — no account was created and no credentials were sent.');
  else if (e.target.id==='forgotForm') showToast('Demo only — no recovery email was sent.');
  else if (e.target.id==='supportForm') showToast('Demo only — your message was not sent to a support team.');
  else if (e.target.id==='kycForm') showToast('Demo only — no documents were uploaded or submitted.');
  else if (e.target.id==='settingsForm') showToast('Demo only — settings were not saved.');
});
document.getElementById('mobileToggle').addEventListener('click', () => {
  const nav=document.getElementById('mainNav'); const open=nav.classList.toggle('open');
  document.getElementById('mobileToggle').setAttribute('aria-expanded',String(open));
});
document.getElementById('mainNav').addEventListener('click',e=>{if(e.target.closest('a')){document.getElementById('mainNav').classList.remove('open');document.getElementById('mobileToggle').setAttribute('aria-expanded','false')}});
document.addEventListener('input', e => {
  if(e.target.id==='marketSearch') {
    const q=e.target.value.toLowerCase();
    document.getElementById('marketTable').innerHTML=renderMarkets(marketRows.filter(r=>r.join(' ').toLowerCase().includes(q)));
  }
});
go('home');

// Floating support chat is a UI preview only until a real live-chat service is connected.
const liveChatPanel = document.getElementById('liveChatPanel');
const liveChatLauncher = document.getElementById('liveChatLauncher');
const liveChatClose = document.getElementById('liveChatClose');
const liveChatMessages = document.getElementById('liveChatMessages');
const liveChatForm = document.getElementById('liveChatForm');
const liveChatInput = document.getElementById('liveChatInput');
function setLiveChatOpen(open) {
  liveChatPanel.classList.toggle('hidden', !open);
  liveChatPanel.setAttribute('aria-hidden', String(!open));
  liveChatLauncher.setAttribute('aria-expanded', String(open));
  if (open) liveChatInput.focus();
}
liveChatLauncher.addEventListener('click', () => setLiveChatOpen(liveChatPanel.classList.contains('hidden')));
liveChatClose.addEventListener('click', () => setLiveChatOpen(false));
liveChatForm.addEventListener('submit', event => {
  event.preventDefault();
  const message = liveChatInput.value.trim();
  if (!message) return;
  const userBubble = document.createElement('div');
  userBubble.className = 'live-chat-message user-message';
  const userLabel = document.createElement('span'); userLabel.textContent = 'YOU';
  userBubble.append(userLabel, document.createTextNode(message));
  liveChatMessages.appendChild(userBubble);
  const reply = document.createElement('div');
  reply.className = 'live-chat-message agent-message';
  const replyLabel = document.createElement('span'); replyLabel.textContent = 'DEMO AUTO-REPLY';
  reply.append(replyLabel, document.createTextNode('Thanks for your message. This chat preview is not connected to a live human agent yet. Please do not share sensitive account or payment information.'));
  liveChatMessages.appendChild(reply);
  liveChatInput.value = '';
  liveChatMessages.scrollTop = liveChatMessages.scrollHeight;
});
