const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/home/claude/mobile-home.png', fullPage: true });

  await page.goto('http://localhost:4173/browse/movie', { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/home/claude/mobile-browse.png', fullPage: true });

  // Open the burger menu to check mobile search
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 20000 });
  await page.click('.navbar-burger');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: '/home/claude/mobile-menu-open.png' });

  await browser.close();
})();
