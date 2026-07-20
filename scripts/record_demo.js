// scripts/record_demo.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const https = require('https');

const OUTPUT_DIR = "C:\\Users\\mario\\Desktop";
const TARGET_BASE_URL = "https://www.rafapp.is";
const API_URL = "https://rafapp-backend.onrender.com/api/auth/token";

function getDemoToken() {
    return new Promise((resolve, reject) => {
        const data = new URLSearchParams({
            username: 'admin.demo@rafapp.is',
            password: '12345678',
            tenant_id: '2'
        }).toString();

        const req = https.request(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': data.length
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.access_token) {
                        resolve(parsed.access_token);
                    } else {
                        reject(new Error("No access_token returned: " + body));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Continuous 60 FPS mouse animation (16ms per frame)
async function smoothAction60fps(page, durationMs = 1500) {
    const steps = Math.floor(durationMs / 16);
    for (let i = 0; i < steps; i++) {
        const x = 500 + Math.sin(i * 0.08) * 350;
        const y = 400 + Math.cos(i * 0.08) * 180;
        await page.mouse.move(x, y).catch(() => {});
        await page.waitForTimeout(16);
    }
}

// Smooth scrolling down & up at 60 FPS
async function smoothScroll60fps(page, distance, durationMs = 1200) {
    const steps = Math.floor(durationMs / 16);
    const stepDist = distance / steps;
    for (let i = 0; i < steps; i++) {
        await page.evaluate((d) => window.scrollBy(0, d), stepDist).catch(() => {});
        await page.waitForTimeout(16);
    }
}

async function runDemoRecorder() {
    console.log("=================================================");
    console.log(" RAFAPP HIGH-DEFINITION 60FPS FEATURE WALKTHROUGH ");
    console.log("=================================================");
    
    console.log("[1/8] Acquiring Session Token for Demo Admin...");
    const token = await getDemoToken();
    console.log("✅ Authenticated via Backend API! Session Authorized.");

    console.log("[2/8] Launching Chromium 60FPS Video Capture...");
    const browser = await chromium.launch({ headless: true });

    const videoStoragePath = path.join(OUTPUT_DIR, 'rafapp_demo_temp');
    if (!fs.existsSync(videoStoragePath)) {
        fs.mkdirSync(videoStoragePath, { recursive: true });
    }

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        recordVideo: {
            dir: videoStoragePath,
            size: { width: 1920, height: 1080 }
        }
    });

    const page = await context.newPage();

    // Authenticate local storage
    await page.goto(`${TARGET_BASE_URL}/login`);
    await page.evaluate((tok) => {
        localStorage.setItem('accessToken', tok);
    }, token);
    await page.waitForTimeout(500);

    // ==========================================
    // 1. DASHBOARD & OPERATIONAL TELEMETRY
    // ==========================================
    console.log("🎥 [1/7] Recording Operational Dashboard...");
    await page.goto(`${TARGET_BASE_URL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 2000);
    await smoothScroll60fps(page, 450, 1500);
    await smoothAction60fps(page, 2000);
    await smoothScroll60fps(page, -450, 1500);

    // ==========================================
    // 2. PROJECTS CATALOG (Click 2nd Project)
    // ==========================================
    console.log("🎥 [2/7] Recording Projects Catalog (Opening 2nd Project)...");
    await page.goto(`${TARGET_BASE_URL}/projects`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);
    await smoothScroll60fps(page, 300, 1000);

    // Find and click second project on the list
    const projectRows = await page.$$('tbody tr, a[href*="/projects/"], div[class*="cursor-pointer"]');
    if (projectRows.length >= 2) {
        console.log("   --> Clicking 2nd project in the list...");
        await projectRows[1].click();
        await page.waitForTimeout(1500);
        await smoothAction60fps(page, 2000);
        await smoothScroll60fps(page, 400, 1500);
        await smoothScroll60fps(page, -400, 1500);
    } else if (projectRows.length > 0) {
        await projectRows[0].click();
        await page.waitForTimeout(1500);
        await smoothScroll60fps(page, 300, 1200);
    }

    // ==========================================
    // 3. TASKS CATALOG & POSTING A COMMENT
    // ==========================================
    console.log("🎥 [3/7] Recording Tasks & Posting Live Comment...");
    await page.goto(`${TARGET_BASE_URL}/tasks`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    const taskRows = await page.$$('tbody tr, a[href*="/tasks/"], div[class*="cursor-pointer"]');
    if (taskRows.length > 0) {
        console.log("   --> Opening task details page...");
        await taskRows[0].click();
        await page.waitForTimeout(1500);
        await smoothScroll60fps(page, 500, 1500);

        // Find comment textarea and post comment
        const commentTextarea = await page.$('textarea');
        if (commentTextarea) {
            console.log("   --> Typing task comment...");
            await commentTextarea.focus();
            await page.keyboard.type("Verkefni í gangi. Allt í samræmi við teikningar og ÍST 150 staðla.", { delay: 40 });
            await page.waitForTimeout(800);
            
            const postBtn = await page.$('button[type="submit"], button:has-text("Post"), button:has-text("Senda")');
            if (postBtn) {
                console.log("   --> Submitting comment...");
                await postBtn.click();
                await page.waitForTimeout(2500);
            }
        }
        await smoothAction60fps(page, 2000);
    }

    // ==========================================
    // 4. DRAWINGS DATABASE (AJOUR)
    // ==========================================
    console.log("🎥 [4/7] Recording Drawings Database & Offline Cache...");
    await page.goto(`${TARGET_BASE_URL}/drawings`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);
    const drawCard = await page.$('tbody tr, div[class*="cursor-pointer"]');
    if (drawCard) {
        await drawCard.click();
        await page.waitForTimeout(1500);
        await smoothAction60fps(page, 2000);
        await smoothScroll60fps(page, 300, 1200);
    }

    // ==========================================
    // 5. INVENTORY & SHOPS (Cable ladders, RV-K, Supplier Links)
    // ==========================================
    console.log("🎥 [5/7] Recording Inventory & Searching Cable Ladders / RV-K / Supplier Links...");
    await page.goto(`${TARGET_BASE_URL}/inventory`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    const searchBox = await page.$('input[type="text"], input[placeholder*="search" i], input[placeholder*="Leita" i]');
    if (searchBox) {
        console.log("   --> Searching for 'cable ladders / electrogalvanized'...");
        await searchBox.fill('');
        await page.keyboard.type("cable ladders", { delay: 60 });
        await page.waitForTimeout(1500);
        await smoothScroll60fps(page, 300, 1000);

        // Navigate shop directory directly in primary tab so video is recorded seamlessly
        console.log("   --> Opening supplier shop catalog...");
        await page.goto(`${TARGET_BASE_URL}/shops`, { waitUntil: 'networkidle' }).catch(() => {});
        await smoothAction60fps(page, 2000);
        await smoothScroll60fps(page, 300, 1000);

        // Go back to inventory and search RV-K
        await page.goto(`${TARGET_BASE_URL}/inventory`, { waitUntil: 'networkidle' }).catch(() => {});
        const searchBox2 = await page.$('input[type="text"], input[placeholder*="search" i], input[placeholder*="Leita" i]');
        if (searchBox2) {
            console.log("   --> Searching for 'rv-k'...");
            await searchBox2.fill('');
            await page.keyboard.type("rv-k", { delay: 60 });
            await page.waitForTimeout(1500);
            await smoothScroll60fps(page, 300, 1000);
        }
    }

    // ==========================================
    // 6. ICELANDIC SALARY CALCULATOR & RSÍ ENGINE
    // ==========================================
    console.log("🎥 [6/7] Recording RSÍ Salary Estimator & Payslip Math...");
    await page.goto(`${TARGET_BASE_URL}/accounting`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    const numInputs = await page.$$('input[type="number"]');
    if (numInputs.length > 0) {
        await numInputs[0].fill('160');
        await page.waitForTimeout(400);
    }
    if (numInputs.length > 1) {
        await numInputs[1].fill('5250');
        await page.waitForTimeout(400);
    }

    const selects = await page.$$('select');
    if (selects.length > 0) {
        await selects[0].selectOption('2026').catch(() => {});
    }

    await smoothScroll60fps(page, 350, 1200);
    await smoothAction60fps(page, 2500);

    // ==========================================
    // 7. SCHEDULING, GANTT & ASSETS (FLEET/TOOLS)
    // ==========================================
    console.log("🎥 [7/7] Recording Scheduling Grid, Gantt, Fleet & Tools...");
    
    await page.goto(`${TARGET_BASE_URL}/scheduling`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);
    await smoothScroll60fps(page, 300, 1000);

    await page.goto(`${TARGET_BASE_URL}/gantt`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);
    await smoothScroll60fps(page, 300, 1000);

    await page.goto(`${TARGET_BASE_URL}/tools`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    await page.goto(`${TARGET_BASE_URL}/cars`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    await page.goto(`${TARGET_BASE_URL}/laws`, { waitUntil: 'networkidle' }).catch(() => {});
    await smoothAction60fps(page, 1500);

    console.log("Finalizing 60FPS Video Capture Stream...");
    await page.close();
    await context.close();
    await browser.close();

    // Select the largest video file from storage directory
    const files = fs.readdirSync(videoStoragePath)
        .filter(f => f.endsWith('.webm'))
        .map(f => ({
            name: f,
            size: fs.statSync(path.join(videoStoragePath, f)).size
        }))
        .sort((a, b) => b.size - a.size);

    if (files.length > 0) {
        const finalPath = path.join(OUTPUT_DIR, 'RafApp_Interactive_Showcase_60FPS.webm');
        if (fs.existsSync(finalPath)) {
            fs.unlinkSync(finalPath);
        }
        fs.renameSync(path.join(videoStoragePath, files[0].name), finalPath);
        fs.rmdirSync(videoStoragePath, { recursive: true });
        console.log(`\n🎉 HIGH-DEFINITION 60FPS INTERACTIVE VIDEO CREATED (${(files[0].size / (1024*1024)).toFixed(2)} MB): ${finalPath}`);
    }
}

runDemoRecorder().catch(err => {
    console.error("Recording error:", err);
});
