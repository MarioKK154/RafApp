/**
 * Fix 3 specific screenshots with correct routes
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

// Only the shots that need fixing
const SHOTS = [
  { file: 'Post06_TimeLogs.png',  path: '/timelogs',   wait: 5000 },
  { file: 'Post08_Tasks.png',     path: '/tasks',       wait: 5000 },  // tasks is better
  { file: 'Post09_Calendar.png',  path: '/calendar',    wait: 5000 },  // cleaner than notifications
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiPost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = querystring.stringify(body);
    const urlObj  = new URL(`${API_BASE}${endpoint}`);
    const req = https.request({
      hostname: urlObj.hostname, path: urlObj.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(bodyStr) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(data) }); } catch(e) { resolve({ status: res.statusCode, data }); } });
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
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    }).on('error', reject);
  });
}

(async () => {
  const tenants = await apiGet('/auth/login-tenants');
  const tenant = (Array.isArray(tenants) ? tenants : []).find(t => t.name?.toLowerCase().includes('demo')) || tenants[0];
  
  const res = await apiPost('/auth/token', { username: EMAIL, password: PASSWORD, tenant_id: tenant.id, keep_signed_in: 'false' });
  const token = res.data?.access_token;
  if (!token) { console.error('No token'); process.exit(1); }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1000);
  await page.evaluate((tok) => {
    localStorage.setItem('accessToken', tok);
    localStorage.setItem('authRememberMe', 'false');
  }, token);

  for (const shot of SHOTS) {
    console.log(`📸 ${shot.file}`);
    await page.goto(`${APP_URL}${shot.path}`, { waitUntil: 'networkidle2', timeout: 25000 });
    await sleep(shot.wait);
    await page.evaluate(() => {
      document.querySelectorAll('.Toastify__toast, [class*="toast-container"]').forEach(el => el.remove());
    });
    await sleep(300);
    await page.screenshot({ path: path.join(OUT_DIR, shot.file), clip: { x: 0, y: 0, width: 1440, height: 900 } });
    console.log(`  ✅ ${shot.file}`);
  }

  await browser.close();
  console.log('🎉 Done!');
})();
