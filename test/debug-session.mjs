import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

page.on('response', res => {
  if (res.url().includes('localhost:3000')) {
    const sc = res.headers()['set-cookie'];
    if (sc) console.log('SET-COOKIE from', res.url().replace('http://localhost:3000', ''), ':', sc.substring(0, 120));
  }
});

// 1. Create account
console.log('--- Creating account ---');
await page.goto('http://localhost:3000/login?creating=true', { waitUntil: 'networkidle0' });
await page.type('input[name="acct"]', 'dbguser');
await page.type('input[name="pw"]', 'testpass123');
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0' }),
  page.click('input[value="create account"]'),
]);
console.log('URL after register:', page.url());

// Check cookies
const cookies = await page.cookies();
console.log('Cookies:', cookies.map(c => `${c.name}(secure=${c.secure},httpOnly=${c.httpOnly},sameSite=${c.sameSite})`));

// 2. Go to submit
console.log('\n--- Going to submit ---');
await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle0' });
console.log('URL:', page.url());
const hasBtn = await page.$('input[value="submit"]');
console.log('Has submit button:', !!hasBtn);

// Check if we're still authenticated
const headerText = await page.$eval('.header-right', el => el.textContent);
console.log('Header right:', headerText.trim());

// 3. Try submit
if (hasBtn) {
  console.log('\n--- Submitting story ---');
  await page.type('input[name="title"]', 'Debug Session Test');
  await page.type('input[name="url"]', 'https://debug-' + Date.now() + '.com');
  
  // Listen for the POST request
  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('POST to:', req.url().replace('http://localhost:3000', ''));
      console.log('POST cookies:', req.headers()['cookie'] ? 'YES' : 'NO');
    }
  });
  
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
    page.click('input[value="submit"]'),
  ]);
  console.log('URL after submit:', page.url());
}

// Cleanup
import Database from 'better-sqlite3';
import path from 'path';
const db = new Database(path.join(process.cwd(), 'data', 'hn.db'));
const u = db.prepare('SELECT id FROM users WHERE username = ?').get('dbguser');
if (u) {
  db.prepare('DELETE FROM items WHERE by = ?').run('dbguser');
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
}
db.close();

await browser.close();
console.log('\nDone');
