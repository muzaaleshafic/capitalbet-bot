const puppeteer = require('puppeteer');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERVISOR_CHAT_ID = process.env.SUPERVISOR_CHAT_ID;

// Replace 'index.html' with the exact filename you uploaded in Step 2
const BRANCHES = [
  { name: 'Wantoni', url: 'file://' + process.cwd() + '/index.html' }
];

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  for (const branch of BRANCHES) {
    await page.goto(branch.url, { waitUntil: 'networkidle2' });
    const imagePath = `screenshot_${branch.name}.png`;
    await page.screenshot({ path: imagePath, fullPage: true });

    const form = new FormData();
    form.append('chat_id', SUPERVISOR_CHAT_ID);
    form.append('caption', `📊 Daily Target & Sales Summary for *${branch.name} Branch*\n📅 Date: ${new Date().toLocaleDateString()}`);
    form.append('photo', fs.createReadStream(imagePath));

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form
    });
    
    fs.unlinkSync(imagePath);
  }
  await browser.close();
}

run().catch(console.error);
