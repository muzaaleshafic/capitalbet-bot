const puppeteer = require('puppeteer');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERVISOR_CHAT_ID = process.env.SUPERVISOR_CHAT_ID;

// List all your actual branches here
const BRANCHES = ['Wantoni', 'Mukono', 'Jinja'];

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const filePath = 'file://' + path.join(process.cwd(), 'index.html');

  for (const branchName of BRANCHES) {
    try {
      console.log(`Checking report for ${branchName}...`);
      await page.goto(filePath, { waitUntil: 'networkidle2' });

      // Automatically set the branch name
      await page.evaluate((branch) => {
        const branchInput = document.getElementById('branch');
        if (branchInput) {
          branchInput.value = branch;
          branchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, branchName);

      await new Promise(r => setTimeout(r, 1500));

      // Check if there are actual sales figures entered (checking the normal total element)
      const hasSales = await page.evaluate(() => {
        const normalTotal = document.getElementById('normalTotal');
        if (!normalTotal) return false;
        const val = parseFloat(normalTotal.textContent.replace(/,/g, '')) || 0;
        return val > 0; // Returns true only if sales total is greater than 0
      });

      if (!hasSales) {
        console.log(`Skipping ${branchName} - No sales data entered yet.`);
        continue; // Skip sending if no sales exist
      }

      // If sales exist, capture and send
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
