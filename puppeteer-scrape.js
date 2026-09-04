import fs from 'fs';
import path from 'path';
import { connect } from 'puppeteer-real-browser';

// Preia categoria transmisă ca argument în linia de comandă (ex: node puppeteer-scrape.js morning)
const category = process.argv[2] || 'morning';

// Maparea categoriilor pe URL-urile corespunzătoare
const URLS = {
  morning: 'https://viatasisanatate.ro/devotional-de-dimineata',
  women: 'https://viatasisanatate.ro/devotional-pentru-femei',
  explorers: 'https://viatasisanatate.ro/devotional-pentru-explo',
  youth: 'https://viatasisanatate.ro/devotional-pentru-tineri'
};

const category = process.argv[2];

if (!URLS[category]) {
  console.error(`Categorie invalidă: ${category}`);
  process.exit(1);
}

const targetUrl = URLS[category];

(async () => {
    let browser, page;
    try {
        // Conectare prin puppeteer-real-browser optimizată pentru servere/headless
const response = await connect({
    headless: 'new',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
    ],
    customConfig: {
        chromePath: process.env.CHROME_PATH || undefined
    },
    turnstile: true,
    disableXvfb: true
});

        browser = response.browser;
        page = response.page;

        // Navigare către pagina devotaționalului
        await page.goto(urls[category], { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Extragerea titlului și a conținutului
        const data = await page.evaluate(() => {
            // Selectează titlul principal al articolului
            const titleEl = document.querySelector('h1.entry-title, h1, .post-title');
            const title = titleEl ? titleEl.innerText.trim() : '';

            // Selectează blocul principal cu textul devoționalului
            const contentEl = document.querySelector('.entry-content, .post-content, article');
            
            if (contentEl) {
                // Elimină elementele nedorite (reclame, scripturi, stiluri, navigație)
                const unwanted = contentEl.querySelectorAll('script, style, iframe, .sharedaddy, .jp-relatedposts');
                unwanted.forEach(el => el.remove());
            }

            const content = contentEl ? contentEl.innerHTML.trim() : '';

            return { title, content };
        });

        if (!data.title && !data.content) {
            throw new Error('Nu s-a putut extrage conținutul de pe pagină.');
        }

        // Asigură existența folderului cache
        const cacheDir = path.join(process.cwd(), 'cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        // Pregătirea structurii de date finale
        const resultData = {
            success: true,
            category: category,
            updatedAt: new Date().toISOString(),
            title: data.title,
            content: data.content
        };

        // Salvarea în fișierul JSON corespunzător (ex: ./cache/morning.json)
        const filePath = path.join(cacheDir, `${category}.json`);
        fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2), 'utf-8');

        console.log(JSON.stringify({ success: true, category: category }));

    } catch (error) {
        console.error(JSON.stringify({ success: false, category: category, error: error.message }));
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
