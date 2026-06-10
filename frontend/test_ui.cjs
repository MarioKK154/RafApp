const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Listen for console events
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('BROWSER_CONSOLE_ERROR:', msg.text());
            }
        });
        
        // Listen for unhandled exceptions
        page.on('pageerror', err => {
            console.log('BROWSER_PAGE_ERROR:', err.toString());
        });

        // Add a mock token so it doesn't redirect to login
        await page.goto('http://localhost:5173/accounting');
        await page.evaluate(() => {
            localStorage.setItem('token', 'mock-token');
        });
        await page.goto('http://localhost:5173/accounting', { waitUntil: 'networkidle2' });

        await new Promise(r => setTimeout(r, 3000));
        await browser.close();
    } catch (e) {
        console.error('PUPPETEER SCRIPT ERROR:', e);
    }
})();
