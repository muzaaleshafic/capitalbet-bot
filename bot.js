const puppeteer = require('puppeteer');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERVISOR_CHAT_ID = process.env.SUPERVISOR_CHAT_ID;

// Your live Netlify site URL
const LIVE_SITE_URL = 'https://targetsheet1.netlify.app/';

// List your active branch names here
const BRANCHES = ['Wantoni', 'Mukono', 'Jinja'];

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  for (const branchName of BRANCHES) {
    try {
      console.log(`Checking live report for ${branchName}...`);
      await page.goto(LIVE_SITE_URL, { waitUntil: 'networkidle2' });

      // Automatically fill in the branch name on the live site
      await page.evaluate((branch) => {
        const branchInput = document.getElementById('branch');
        if (branchInput) {
          branchInput.value = branch;
          branchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, branchName);

      await new Promise(r => setTimeout(r, 2000));

      // Check if sales data exists on the live page
      const hasSales = await page.evaluate(() => {
        const normalTotal = document.getElementById('normalTotal');
        if (!normalTotal) return false;
        const val = parseFloat(normalTotal.textContent.replace(/,/g, '')) || 0;
        return val > 0; // Only true if sales total is greater than 0
      });

      if (!hasSales) {
        console.log(`Skipping ${branchName} - No sales data entered on the live site yet.`);
        continue; // Skip sending if no sales exist
      }

      // Capture screenshot if sales exist
      const imagePath = `screenshot_${branchName}.png`;
      await page.screenshot({ path: imagePath, fullPage: true });

      const form = new FormData();
      form.append('chat_id', SUPERVISOR_CHAT_ID);
      form.append('caption', `📊 *Daily Branch Report*\n🏢 Branch: *${branchName}*\n📅 Date: ${new Date().toLocaleDateString()}`);
      form.append('photo', fs.createReadStream(imagePath));

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        console.error(`Failed to send telegram photo for ${branchName}`);
      }

      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error(`Error processing branch ${branchName}:`, err);
    }
  }

  await browser.close();
}

run().catch(console.error);
