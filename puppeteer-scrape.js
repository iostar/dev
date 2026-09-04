import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// 1. Mapparea categoriilor la URL-urile actualizate ale site-ului
const URLS = {
  morning: 'https://viatasisanatate.ro/devotional-de-dimineata',
  women: 'https://viatasisanatate.ro/devotional-pentru-femei',
  explorers: 'https://viatasisanatate.ro/devotional-pentru-explo',
  youth: 'https://viatasisanatate.ro/devotional-pentru-tineri'
};

// 2. Preia categoria din argumentele liniei de comandă (ex: node puppeteer-scrape.js morning)
const category = process.argv[2];

if (!category || !URLS[category]) {
  console.error(`Eroare: Categorie invalidă sau nedefinită "${category}". Optiuni valide: ${Object.keys(URLS).join(', ')}`);
  process.exit(1);
}

const targetUrl = URLS[category];

(async () => {
  console.log(`[${category}] Începe procesul de scraping pentru: ${targetUrl}`);
  
  let browser;
  try {
    // Lansare browser Puppeteer cu argumentele necesare pentru mediu Linux (GitHub Actions / Docker)
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Setare User-Agent de browser real pentru a preveni blocajele
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigare către URL-ul țintă cu timeout extins
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Extragerea datelor din pagină (titlu, text, etc.)
    const data = await page.evaluate(() => {
      // Ajustează selectorii CSS în funcție de structura HTML a site-ului
      const title = document.querySelector('h1')?.innerText?.trim() || '';
      const contentElements = Array.from(document.querySelectorAll('article, .entry-content, .content, main p'));
      const content = contentElements.map(el => el.innerText.trim()).filter(text => text.length > 0).join('\n\n');

      return {
        title,
        content,
        scrapedAt: new Date().toISOString()
      };
    });

    // Asigură-te că folderul 'cache' există
    const cacheDir = path.join(process.cwd(), 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Salvează rezultatul în cache/<category>.json
    const filePath = path.join(cacheDir, `${category}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ category, url: targetUrl, ...data }, null, 2), 'utf-8');

    console.log(`[${category}] Succes! Datele au fost salvate în ${filePath}`);

  } catch (error) {
    console.error(`[${category}] Eroare în timpul scraping-ului:`, error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
