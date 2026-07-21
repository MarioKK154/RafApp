/**
 * RafApp LinkedIn Screenshot Capture
 * - Calls API directly for JWT token
 * - Injects token into localStorage with correct key ('accessToken')
 * - Captures 10 real screenshots of the live app
 */
const puppeteer = require('puppeteer');
const https = require('https');
const path = require('path');
const querystring = require('querystring');

const APP_URL  = 'https://www.rafapp.is';
const API_BASE = 'https://rafapp-backend.onrender.com/api';
const EMAIL    = 'admin.demo@rafapp.is';
const PASSWORD = '12345678';
const OUT_DIR  = 'C:\\Users\\mario\\Desktop\\RafApp LinkedIn';

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const SHOTS = [
  { file: 'Post01_Dashboard.png',     path: '/dashboard',     wait: 6000 },
  { file: 'Post02_GanttChart.png',    path: '/gantt',         wait: 7000 },
  { file: 'Post03_Scheduling.png',    path: '/scheduling',    wait: 5000 },
  { file: 'Post04_Projects.png',      path: '/projects',      wait: 5000 },
  { file: 'Post05_Inventory.png',     path: '/inventory',     wait: 5000 },
  { file: 'Post06_TimeLogs.png',      path: '/time-logs',     wait: 5000 },
  { file: 'Post07_Accounting.png',    path: '/accounting',    wait: 6000 },
  { file: 'Post08_Offers.png',        path: '/offers',        wait: 5000 },
  { file: 'Post09_Notifications.png', path: '/notifications', wait: 4000 },
  { file: 'Post10_Dashboard2.png',    path: '/dashboard',     wait: 6000 },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = querystring.stringify(body);
    const urlObj  = new URL(`${API_BASE}${endpoint}`);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`${API_BASE}${endpoint}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

(async () => {
  // ── 1. Get tenant list ───────────────────────────────────────────────────
  console.log('🔍 Fetching tenants...');
  const tenantsRaw = await apiGet('/auth/login-tenants');
  const tenants = Array.isArray(tenantsRaw) ? tenantsRaw : [];
  console.log('Tenants:', JSON.stringify(tenants.map(t => `${t.id}:${t.name}`)));

  const tenant = tenants.find(t =>
    t.name?.toLowerCase().includes('demo') ||
    t.name?.toLowerCase().includes('showcase')
  ) || tenants[0];

  if (!tenant) { console.error('❌ No tenants found'); process.exit(1); }
  console.log(`✅ Using: "${tenant.name}" (ID=${tenant.id})`);

  // ── 2. Login via API ─────────────────────────────────────────────────────
  console.log('🔐 Authenticating...');
  const res = await apiPost('/auth/token', {
    username: EMAIL,
    password: PASSWORD,
    tenant_id: tenant.id,
    keep_signed_in: 'false',
  });

  console.log('Login response status:', res.status);
  console.log('Login response data:', JSON.stringify(res.data).substring(0, 200));

  if (!res.data?.access_token) {
    console.error('❌ No access token received');
    process.exit(1);
  }
  const token = res.data.access_token;
  console.log('✅ Token acquired');

  // ── 3. Launch browser ────────────────────────────────────────────────────
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Navigate to the app first to establish the origin
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2000);

  // Inject the JWT with the EXACT key the app uses: 'accessToken'
  await page.evaluate((tok) => {
    localStorage.setItem('accessToken', tok);
    localStorage.setItem('authRememberMe', 'false');
  }, token);

  console.log('💉 Token injected into localStorage');

  // Navigate to dashboard
  await page.goto(`${APP_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(5000);

  const url = page.url();
  console.log(`📍 URL after auth: ${url}`);
  await page.screenshot({ path: path.join(OUT_DIR, '_debug_dashboard.png') });

  if (url.includes('/login')) {
    const ls = await page.evaluate(() => {
      const r = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        r[k] = (localStorage.getItem(k) || '').slice(0, 80);
      }
      return r;
    });
    console.error('❌ Still on login page. localStorage:', JSON.stringify(ls, null, 2));
    await browser.close();
    process.exit(1);
  }

  console.log('✅ Logged in! Capturing screenshots...\n');

  // ── 4. Screenshot loop ───────────────────────────────────────────────────
  for (const shot of SHOTS) {
    console.log(`📸 ${shot.file}`);
    try {
      await page.goto(`${APP_URL}${shot.path}`, { waitUntil: 'networkidle2', timeout: 25000 });
      await sleep(shot.wait);

      // Dismiss toasts and overlays
      await page.evaluate(() => {
        document.querySelectorAll('.Toastify__toast, [class*="toast-container"]').forEach(el => el.remove());
      });
      await sleep(300);

      await page.screenshot({
        path: path.join(OUT_DIR, shot.file),
        clip: { x: 0, y: 0, width: 1440, height: 900 },
      });
      console.log(`  ✅ Saved → ${shot.file}`);
    } catch(e) {
      console.error(`  ❌ Failed: ${e.message}`);
      try { await page.screenshot({ path: path.join(OUT_DIR, `_err_${shot.file}`) }); } catch(_) {}
    }
  }

  await browser.close();
  console.log('\n🎉 All screenshots captured!');
})();
