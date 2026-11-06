const puppeteer = require('puppeteer');
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPERVISOR_CHAT_ID = process.env.SUPERVISOR_CHAT_ID;

// List all your branches here! 
// You can host your index.html online (e.g., on Netlify) or pass branch identifiers.
const BRANCHES = [
  { name: 'Wantoni', url: 'https://your-live-netfliy-site.netlify.app/?branch=Wantoni' },
  { name: 'Mukono', url: 'https://your-live-netfliy-site.netlify.app/?branch=Mukono' },
  { name: 'Jinja', url: 'https://your-live-netfliy-site.netlify.app/?branch=Jinja' }
  // Add as many branches as you need here!
];

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  for (const branch of BRANCHES) {
    try {
      console.log(`Capturing report for ${branch.name}...`);
      await page.goto(branch.url, { waitUntil: 'networkidle2' });
      
      // Optional: Add a small delay if local storage/data takes a moment to load
      await new Promise(r => setTimeout(r, 2000));

      const imagePath = `screenshot_${branch.name}.png`;
      await page.screenshot({ path: imagePath, fullPage: true });

      const form = new FormData();
      form.append('chat_id', SUPERVISOR_CHAT_ID);
      form.append('caption', `📊 *Daily Branch Report*\n🏢 Branch: *${branch.name}*\n📅 Date: ${new Date().toLocaleDateString()}`);
      form.append('photo', fs.createReadStream(imagePath));

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        console.error(`Failed to send telegram photo for ${branch.name}`);
      }

      fs.unlinkSync(imagePath);
    } catch (err) {
      console.error(`Error processing branch ${branch.name}:`, err);
    }
  }

  await browser.close();
}

run().catch(console.error);
