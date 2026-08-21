import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/index.test.html');
  // Wait for the components to mount
  await page.waitForTimeout(1000);
  
  const content = await page.content();
  console.log(content.includes('**bold**')); // Should be false
  console.log(content.includes('## Heading')); // Should be false
  console.log(content.includes('<strong')); // Should be true
  
  await browser.close();
})();
