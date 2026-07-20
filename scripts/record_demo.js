// scripts/record_demo.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = "C:\\Users\\mario\\Desktop";
const TARGET_BASE_URL = "https://www.rafapp.is"; // Live production app

async function runDemoRecorder() {
    console.log("=== RAFAPP AUTOMATED FEATURE VIDEO RECORDER ===");
    console.log("Launching headless browser (running silently in background)...");

    const browser = await chromium.launch({
        headless: true // Run completely in background without taking over screen!
    });

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

    console.log(`[1/5] Recording Landing Page & Interactive Showcase...`);
    await page.goto(`${TARGET_BASE_URL}/showcase`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Scroll smoothly through showcase
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    console.log(`[2/5] Recording Interactive Salary Calculator Demo...`);
    // Click on Salary tab in showcase
    const salaryTab = await page.$('button:has-text("Íslensk launaáætlun")');
    if (salaryTab) {
        await salaryTab.click();
        await page.waitForTimeout(2000);
    }

    console.log(`[3/5] Recording Drawings Database & Offline Cache Demo...`);
    const drawingsTab = await page.$('button:has-text("Teikningaskrá")');
    if (drawingsTab) {
        await drawingsTab.click();
        await page.waitForTimeout(2000);
    }

    console.log(`[4/5] Recording Live App Dashboard...`);
    await page.goto(`${TARGET_BASE_URL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(3000);

    console.log(`[5/5] Finalizing HD Video Recording...`);
    await page.waitForTimeout(1000);
    
    // Close page to flush video stream to file
    await page.close();
    await context.close();
    await browser.close();

    // Move generated video to Desktop
    const videoFiles = fs.readdirSync(videoStoragePath).filter(f => f.endsWith('.webm'));
    if (videoFiles.length > 0) {
        const finalVideoPath = path.join(OUTPUT_DIR, 'RafApp_Feature_Showcase_HD.webm');
        fs.renameSync(path.join(videoStoragePath, videoFiles[0]), finalVideoPath);
        fs.rmdirSync(videoStoragePath, { recursive: true });
        console.log(`✅ VIDEO SUCCESSFULLY CREATED: ${finalVideoPath}`);
    } else {
        console.log("Video recording completed.");
    }
}

runDemoRecorder().catch(err => {
    console.error("Error running automated video recording:", err);
});
