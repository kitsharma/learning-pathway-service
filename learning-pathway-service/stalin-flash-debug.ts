import puppeteer from 'puppeteer';

async function stalinFlashDebug() {
  console.log('🔴 STALIN\'S FLASH DEBUG TEST');
  console.log('Investigating the flash issue systematically...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable request interception to track network activity
    await page.setRequestInterception(true);
    const requests: string[] = [];
    
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`);
      request.continue();
    });
    
    // Track console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Track page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    // Navigate and wait for different states
    console.log('PHASE 1: Initial page load...');
    const response = await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    console.log(`- Response status: ${response?.status()}`);
    
    // Check immediately after DOM loads
    const phase1Check = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        hasRoot: !!root,
        rootHTML: root?.innerHTML || 'NO ROOT',
        bodyClasses: document.body.className,
        scripts: Array.from(document.scripts).map(s => s.src || 'inline').filter(s => !s.includes('puppeteer'))
      };
    });
    console.log('- DOM Check:', phase1Check);
    
    // Wait a bit to see if React renders
    console.log('\nPHASE 2: After 1 second...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const phase2Check = await page.evaluate(() => {
      const root = document.getElementById('root');
      const buttons = document.querySelectorAll('button');
      const selects = document.querySelectorAll('select');
      
      return {
        rootChildren: root?.children.length || 0,
        rootFirstChild: root?.firstElementChild?.tagName || 'NONE',
        buttonCount: buttons.length,
        selectCount: selects.length,
        hasReactApp: !!window.React && !!window.ReactDOM,
        reactVersion: window.React?.version || 'NOT LOADED'
      };
    });
    console.log('- React Check:', phase2Check);
    
    // Wait for network to settle
    console.log('\nPHASE 3: After network idle...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    
    const phase3Check = await page.evaluate(() => {
      const getVisibleText = () => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: function(node) {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const style = getComputedStyle(parent);
              if (style.display === 'none' || style.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );
        
        const texts = [];
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text && text.length > 0) {
            texts.push(text);
          }
        }
        return texts.slice(0, 10); // First 10 visible texts
      };
      
      return {
        visibleTexts: getVisibleText(),
        totalElements: document.querySelectorAll('*').length,
        formElements: {
          buttons: document.querySelectorAll('button').length,
          selects: document.querySelectorAll('select').length,
          inputs: document.querySelectorAll('input').length
        }
      };
    });
    console.log('- Visibility Check:', phase3Check);
    
    // Check for any JavaScript errors in loading React components
    console.log('\nPHASE 4: JavaScript execution check...');
    const jsCheck = await page.evaluate(() => {
      try {
        // Check if React rendered successfully
        const root = document.getElementById('root');
        const reactRoot = (root as any)?._reactRootContainer;
        
        return {
          hasReactRoot: !!reactRoot,
          rootChildrenCount: root?.children.length || 0,
          rootInnerHTMLLength: root?.innerHTML.length || 0,
          appComponentFound: !!document.querySelector('[class*="min-h-screen"]'),
          gradientBgFound: !!document.querySelector('.gradient-bg')
        };
      } catch (e) {
        return { error: (e as Error).toString() };
      }
    });
    console.log('- JS Execution:', jsCheck);
    
    // Network analysis
    console.log('\n📊 NETWORK ANALYSIS:');
    console.log(`Total requests: ${requests.length}`);
    const externalRequests = requests.filter(r => !r.includes('localhost'));
    console.log('External resources loaded:');
    externalRequests.forEach(r => console.log(`  - ${r}`));
    
    // Console analysis
    console.log('\n📊 CONSOLE OUTPUT:');
    if (consoleLogs.length === 0) {
      console.log('  No console messages');
    } else {
      consoleLogs.forEach(log => console.log(`  ${log}`));
    }
    
    // Error analysis
    console.log('\n📊 PAGE ERRORS:');
    if (pageErrors.length === 0) {
      console.log('  No page errors');
    } else {
      pageErrors.forEach(err => console.log(`  ERROR: ${err}`));
    }
    
    // Final verdict
    console.log('\n🔴 STALIN\'S DIAGNOSIS:');
    if (phase3Check.totalElements < 50) {
      console.log('❌ PROBLEM: Page has very few elements. React likely failed to render.');
    } else if (phase3Check.formElements.buttons === 0) {
      console.log('❌ PROBLEM: No buttons found. UI components not rendering.');
    } else if (phase3Check.visibleTexts.length < 5) {
      console.log('❌ PROBLEM: Very little visible text. Content may be hidden.');
    } else {
      console.log('✅ Page appears to be rendering correctly.');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'stalin-flash-debug-final.png' });
    console.log('\nScreenshot saved: stalin-flash-debug-final.png');
    
  } catch (error) {
    console.log(`\n🔴 STALIN DEBUG TEST FAILED: ${error}`);
  } finally {
    await browser.close();
  }
}

// Add type declarations for window.React
declare global {
  interface Window {
    React?: any;
    ReactDOM?: any;
  }
}

stalinFlashDebug().catch(console.error);