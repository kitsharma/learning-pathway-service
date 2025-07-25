import puppeteer from 'puppeteer';

async function stalinTest() {
  console.log('🔴 STALIN\'S RUTHLESS VERIFICATION TEST');
  console.log('Testing with scientific precision...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('TEST 1: Page load verification');
    const startTime = Date.now();
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 10000 });
    const loadTime = Date.now() - startTime;
    console.log(`✅ Page loaded in ${loadTime}ms`);
    
    console.log('\nTEST 2: Critical elements detection');
    
    // Check for select element
    const selectExists = await page.$('select') !== null;
    console.log(`Select element: ${selectExists ? '✅ FOUND' : '❌ MISSING'}`);
    
    // Check for Add Skill button
    const addSkillExists = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Add Skill'));
    });
    console.log(`Add Skill button: ${addSkillExists ? '✅ FOUND' : '❌ MISSING'}`);
    
    // Check for Generate button
    const generateExists = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
    });
    console.log(`Generate button: ${generateExists ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (selectExists && addSkillExists && generateExists) {
      console.log('\n🔴 STALIN VERDICT: SERVICE IS FUNCTIONAL!');
      console.log('All critical UI elements detected. Ready for enhanced search testing.');
    } else {
      console.log('\n🔴 STALIN VERDICT: SERVICE DEFECTIVE!');
      console.log('Critical UI elements missing. Fix immediately!');
    }
    
  } catch (error) {
    console.log('\n🔴 STALIN VERDICT: COMPLETE FAILURE!');
    console.log(`Error: ${error}`);
  } finally {
    await browser.close();
  }
}

stalinTest().catch(console.error);