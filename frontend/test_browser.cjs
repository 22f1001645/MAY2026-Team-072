const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:5173/organiser', {waitUntil: 'networkidle2'});
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    console.error('PUPPETEER ERROR:', err);
  }
  
  await browser.close();
})();
