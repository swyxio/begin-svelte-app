import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';
const USERNAME = 'e2e_' + Date.now().toString(36).slice(-6);
const PASSWORD = 'testpass123';

let browser, page;
let passed = 0, failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

async function run() {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // === Test 1: Homepage loads ===
    console.log('\n1. Homepage');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 10000 });
    const title = await page.title();
    assert(title === 'Hacker News', `Title is "${title}"`);
    const headerText = await page.$eval('.header-site-name', el => el.textContent);
    assert(headerText.includes('Hacker News'), `Header shows "Hacker News"`);
    const stories = await page.$$('.story-link');
    assert(stories.length > 0, `${stories.length} stories rendered`);
    const loginLink = await page.$('a[href="/login"]');
    assert(loginLink !== null, 'Login link visible');

    // === Test 2: Navigate to Create Account ===
    console.log('\n2. Create Account');
    await page.goto(`${BASE}/login?creating=true`, { waitUntil: 'networkidle0' });
    const createBtn = await page.$('input[value="create account"]');
    assert(createBtn !== null, 'Create account button visible');
    
    // Fill in the form
    await page.type('input[name="acct"]', USERNAME);
    await page.type('input[name="pw"]', PASSWORD);
    
    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('input[value="create account"]'),
    ]);
    
    const currentUrl = page.url();
    assert(currentUrl === `${BASE}/`, `Redirected to homepage: ${currentUrl}`);
    
    // Check we're logged in (username in header)
    const headerRight = await page.$eval('.header-right', el => el.textContent);
    assert(headerRight.includes(USERNAME), `Username "${USERNAME}" in header`);

    // === Test 3: Submit a story ===
    console.log('\n3. Submit Story');
    await page.goto(`${BASE}/submit`, { waitUntil: 'networkidle0' });
    const submitBtn = await page.$('input[value="submit"]');
    assert(submitBtn !== null, 'Submit button visible');
    
    await page.type('input[name="title"]', 'E2E Browser Test Story');
    await page.type('input[name="url"]', 'https://e2e-test-' + Date.now() + '.example.com');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('input[value="submit"]'),
    ]);
    
    const itemUrl = page.url();
    assert(itemUrl.includes('/item?id='), `Redirected to item page: ${itemUrl}`);
    
    // Check the story is displayed
    const storyTitle = await page.$eval('.story-link', el => el.textContent);
    assert(storyTitle === 'E2E Browser Test Story', `Story title shown: "${storyTitle}"`);

    // === Test 4: Add a comment ===
    console.log('\n4. Add Comment');
    const textarea = await page.$('textarea[name="text"]');
    assert(textarea !== null, 'Comment textarea visible (logged in)');
    
    await page.type('textarea[name="text"]', 'This is an *automated* e2e test comment!');
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('input[value="add comment"]'),
    ]);
    
    // Check the comment appears
    const commentBody = await page.$eval('.comment-body', el => el.innerHTML);
    assert(commentBody.includes('<i>automated</i>'), `Comment has italic formatting: ${commentBody.substring(0, 80)}`);

    // === Test 5: Vote on a story ===
    console.log('\n5. Vote');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    const voteArrows = await page.$$('.vote-arrow-up');
    assert(voteArrows.length > 0, `${voteArrows.length} vote arrows visible`);
    
    // Click the first vote arrow (for someone else's story)
    if (voteArrows.length > 0) {
      await voteArrows[0].click();
      await page.waitForTimeout(1000); // Wait for the async vote
      const votedArrows = await page.$$('.vote-arrow-up.voted');
      assert(votedArrows.length > 0, 'Vote arrow turned orange (voted)');
    }

    // === Test 6: User Profile ===
    console.log('\n6. User Profile');
    await page.goto(`${BASE}/user?id=${USERNAME}`, { waitUntil: 'networkidle0' });
    const profileContent = await page.content();
    assert(profileContent.includes(USERNAME), 'Username on profile page');
    assert(profileContent.includes('karma'), 'Karma label on profile');
    // Should have edit form since it's own profile
    const aboutTextarea = await page.$('textarea[name="about"]');
    assert(aboutTextarea !== null, 'About textarea visible (own profile)');

    // === Test 7: Edit Profile ===
    console.log('\n7. Edit Profile');
    await page.type('textarea[name="about"]', 'Automated test user');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('input[value="update"]'),
    ]);
    const updatedProfile = await page.content();
    assert(updatedProfile.includes('Automated test user'), 'Profile updated with about text');

    // === Test 8: Navigate via header links ===
    console.log('\n8. Navigation');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    
    // Check "threads" link appears for logged-in user
    const threadLink = await page.$(`a[href="/threads?id=${USERNAME}"]`);
    assert(threadLink !== null, 'Threads link visible for logged-in user');

    // Click "ask" 
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('a[href="/ask"]'),
    ]);
    assert(page.url().includes('/ask'), 'Navigated to /ask');

    // === Test 9: Comment collapse ===
    console.log('\n9. Comment Collapse');
    await page.goto(`${BASE}/item?id=1`, { waitUntil: 'networkidle0' });
    const toggleBtns = await page.$$('.toggle-btn');
    assert(toggleBtns.length > 0, `${toggleBtns.length} collapse buttons`);
    
    // Get initial comment count
    const initialBodies = await page.$$('.comment-body');
    const initialCount = initialBodies.length;
    
    // Click first collapse button
    if (toggleBtns.length > 0) {
      await toggleBtns[0].click();
      await page.waitForTimeout(500);
      const afterBodies = await page.$$('.comment-body');
      assert(afterBodies.length < initialCount, `Comments hidden after collapse (${initialCount} → ${afterBodies.length})`);
    }

    // === Test 10: Logout ===
    console.log('\n10. Logout');
    await page.goto(`${BASE}/logout`, { waitUntil: 'networkidle0' });
    const afterLogout = await page.content();
    assert(afterLogout.includes('>login</a>'), 'Login link visible after logout');
    assert(!afterLogout.includes(USERNAME), 'Username not in header after logout');

    // === Test 11: Login with existing account ===
    console.log('\n11. Login');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await page.type('input[name="acct"]', USERNAME);
    await page.type('input[name="pw"]', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('input[value="login"]'),
    ]);
    const afterLogin = await page.content();
    assert(afterLogin.includes(USERNAME), 'Username in header after login');

    // === Test 12: Search ===
    console.log('\n12. Search');
    await page.goto(`${BASE}/search?q=E2E+Browser`, { waitUntil: 'networkidle0' });
    const searchContent = await page.content();
    assert(searchContent.includes('E2E Browser Test Story'), 'Search finds the submitted story');

  } catch (err) {
    console.error('\nTest error:', err.message);
    failed++;
  } finally {
    // Cleanup: remove test user and data
    try {
      const Database = (await import('better-sqlite3')).default;
      const path = (await import('path')).default;
      const db = new Database(path.join(process.cwd(), 'data', 'hn.db'));
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(USERNAME);
      if (user) {
        const uid = user.id;
        db.prepare('DELETE FROM votes WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM favorites WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM hidden WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM flags WHERE user_id = ?').run(uid);
        // Delete comments first (children before parents)
        const items = db.prepare('SELECT id FROM items WHERE by = ? ORDER BY id DESC').all(USERNAME);
        for (const item of items) {
          db.prepare('DELETE FROM votes WHERE item_id = ?').run(item.id);
          db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      }
      db.close();
      console.log('\nCleanup: test data removed');
    } catch (e) {
      console.log('\nCleanup error:', e.message);
    }
    
    await browser.close();
    
    console.log(`\n${'='.repeat(40)}`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`${'='.repeat(40)}`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
