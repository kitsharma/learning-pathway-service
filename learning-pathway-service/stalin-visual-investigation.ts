import puppeteer from 'puppeteer';

async function stalinVisualInvestigation() {
  console.log('🔴 STALIN\'S VISUAL INVESTIGATION');
  console.log('Running with VISIBLE browser to observe the flash issue...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // VISIBLE MODE - WE WILL SEE EVERYTHING
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // Slow down actions to observe better
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log('PAGE CONSOLE:', msg.text());
    });
    
    // Log any page errors
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('STEP 1: Initial navigation...');
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    
    // Take screenshot immediately after DOM loads
    await page.screenshot({ path: 'stalin-1-dom-loaded.png' });
    console.log('Screenshot saved: stalin-1-dom-loaded.png');
    
    // Wait a bit and take another screenshot
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'stalin-2-after-500ms.png' });
    console.log('Screenshot saved: stalin-2-after-500ms.png');
    
    // Check what's in the DOM
    const bodyContent = await page.evaluate(() => {
      return {
        innerHTML: document.body.innerHTML.substring(0, 200),
        childCount: document.body.children.length,
        hasReactRoot: !!document.getElementById('root'),
        rootContent: document.getElementById('root')?.innerHTML.substring(0, 200)
      };
    });
    
    console.log('\nBODY ANALYSIS:');
    console.log('- Child count:', bodyContent.childCount);
    console.log('- Has React root:', bodyContent.hasReactRoot);
    console.log('- Body HTML preview:', bodyContent.innerHTML);
    console.log('- Root HTML preview:', bodyContent.rootContent);
    
    // Wait for network idle using puppeteer's method
    console.log('\nSTEP 2: Waiting for network idle...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'stalin-3-network-idle.png' });
    console.log('Screenshot saved: stalin-3-network-idle.png');
    
    // Check for any elements at all
    const elementCount = await page.evaluate(() => {
      return {
        total: document.querySelectorAll('*').length,
        divs: document.querySelectorAll('div').length,
        buttons: document.querySelectorAll('button').length,
        selects: document.querySelectorAll('select').length,
        forms: document.querySelectorAll('form').length
      };
    });
    
    console.log('\nELEMENT COUNT:');
    console.log('- Total elements:', elementCount.total);
    console.log('- Divs:', elementCount.divs);
    console.log('- Buttons:', elementCount.buttons);  
    console.log('- Selects:', elementCount.selects);
    console.log('- Forms:', elementCount.forms);
    
    // Check computed styles on body and root
    const styles = await page.evaluate(() => {
      const body = document.body;
      const root = document.getElementById('root');
      return {
        body: {
          display: getComputedStyle(body).display,
          visibility: getComputedStyle(body).visibility,
          opacity: getComputedStyle(body).opacity,
          backgroundColor: getComputedStyle(body).backgroundColor
        },
        root: root ? {
          display: getComputedStyle(root).display,
          visibility: getComputedStyle(root).visibility,
          opacity: getComputedStyle(root).opacity,
          backgroundColor: getComputedStyle(root).backgroundColor,
          height: getComputedStyle(root).height
        } : null
      };
    });
    
    console.log('\nCOMPUTED STYLES:');
    console.log('Body:', styles.body);
    console.log('Root:', styles.root);
    
    // Keep browser open for 10 seconds for visual inspection
    console.log('\n🔴 KEEPING BROWSER OPEN FOR 10 SECONDS - OBSERVE THE SCREEN!');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.log(`\n🔴 STALIN VISUAL TEST FAILED: ${error}`);
  } finally {
    await browser.close();
  }
}

stalinVisualInvestigation().catch(console.error);