import puppeteer from 'puppeteer';

async function stalinDeepTest() {
  console.log('🔴 STALIN\'S DEEP INVESTIGATION');
  console.log('Testing dynamic loading behavior...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('LOADING PAGE...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    
    console.log('WAITING FOR ROLES TO LOAD...');
    await page.waitForSelector('select option', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('CHECKING ALL BUTTONS...');
    const allButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim() || '',
        visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
        disabled: btn.disabled
      }));
    });
    
    console.log('ALL BUTTONS FOUND:');
    allButtons.forEach((btn, i) => {
      console.log(`  ${i+1}. "${btn.text}" - Visible: ${btn.visible}, Disabled: ${btn.disabled}`);
    });
    
    // Look specifically for Generate button variations
    const generateButton = allButtons.find(btn => 
      btn.text.toLowerCase().includes('generate') || 
      btn.text.toLowerCase().includes('pathway')
    );
    
    if (generateButton) {
      console.log(`\n✅ GENERATE BUTTON FOUND: "${generateButton.text}"`);
      console.log(`   Visible: ${generateButton.visible}, Disabled: ${generateButton.disabled}`);
    } else {
      console.log('\n❌ NO GENERATE BUTTON FOUND');
    }
    
    console.log('\n🔴 STALIN FINAL ANALYSIS:');
    if (generateButton?.visible && !generateButton?.disabled) {
      console.log('✅ SERVICE FULLY FUNCTIONAL - READY FOR ENHANCED SEARCH TEST');
    } else if (generateButton) {
      console.log('⚠️ GENERATE BUTTON EXISTS BUT NOT READY');
    } else {
      console.log('❌ GENERATE BUTTON MISSING - INVESTIGATE FRONTEND CODE');
    }
    
  } catch (error) {
    console.log(`\n🔴 STALIN INVESTIGATION FAILED: ${error}`);
  } finally {
    await browser.close();
  }
}

stalinDeepTest().catch(console.error);