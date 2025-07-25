import puppeteer from 'puppeteer';

interface ResourceValidationResult {
  title: string;
  url: string;
  provider: string;
  accessible: boolean;
  responseCode: number;
  loadTime: number;
  error?: string;
}

async function testLiveResourceValidation() {
  console.log('🚀 Starting LIVE Resource URL Validation Test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to application
    console.log('📍 Step 1: Loading application...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('select', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clear existing skills
    console.log('📍 Step 2: Setting up test scenario...');
    while (true) {
      const removed = await page.evaluate(() => {
        const removeButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent === '×');
        if (removeButton) {
          (removeButton as HTMLButtonElement).click();
          return true;
        }
        return false;
      });
      
      if (!removed) break;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Add test skill
    await page.evaluate(() => {
      const addButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Add Skill'));
      if (addButton) {
        (addButton as HTMLButtonElement).click();
      }
    });
    
    await page.waitForSelector('input[type="text"]', { timeout: 3000 });
    await page.type('input[type="text"]', 'Customer Service');
    
    await page.evaluate(() => {
      const confirmButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Add');
      if (confirmButton) {
        (confirmButton as HTMLButtonElement).click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Select role
    await page.select('select', 'AI-Enhanced Customer Experience Specialist');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('📍 Step 3: Generating pathway with live Grok API...');
    console.log('   ⏳ This may take 10-15 seconds due to AI processing...');
    
    // Generate pathway
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (generateButton) {
        (generateButton as HTMLButtonElement).click();
      }
    });
    
    // Wait for pathway generation
    await page.waitForFunction(() => {
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      return skillGapSections.length > 0;
    }, { timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📍 Step 4: Extracting resource URLs...');
    
    // Extract all resource URLs
    const resources = await page.evaluate(() => {
      const resourceCards = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4');
      const extractedResources: any[] = [];
      
      resourceCards.forEach(card => {
        const title = card.querySelector('h5')?.textContent || '';
        const provider = card.querySelector('.text-sm.text-gray-600')?.textContent || '';
        const link = card.querySelector('a')?.getAttribute('href') || '';
        
        if (title && link) {
          extractedResources.push({
            title,
            provider,
            url: link
          });
        }
      });
      
      return extractedResources;
    });
    
    console.log(`   Found ${resources.length} resources to validate`);
    
    console.log('📍 Step 5: Validating each resource URL...');
    
    const validationResults: ResourceValidationResult[] = [];
    let successCount = 0;
    
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const startTime = Date.now();
      
      console.log(`   ${i + 1}/${resources.length}: Testing ${resource.title}...`);
      
      try {
        const response = await page.goto(resource.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        
        const loadTime = Date.now() - startTime;
        const responseCode = response?.status() || 0;
        const accessible = responseCode >= 200 && responseCode < 400;
        
        if (accessible) {
          successCount++;
          console.log(`     ✅ SUCCESS: ${responseCode} (${loadTime}ms)`);
        } else {
          console.log(`     ❌ FAILED: ${responseCode} (${loadTime}ms)`);
        }
        
        validationResults.push({
          title: resource.title,
          url: resource.url,
          provider: resource.provider,
          accessible,
          responseCode,
          loadTime
        });
        
      } catch (error: any) {
        const loadTime = Date.now() - startTime;
        console.log(`     ❌ ERROR: ${error.message} (${loadTime}ms)`);
        
        validationResults.push({
          title: resource.title,
          url: resource.url,
          provider: resource.provider,
          accessible: false,
          responseCode: 0,
          loadTime,
          error: error.message
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate final report
    console.log('\\n' + '='.repeat(80));
    console.log('📋 LIVE RESOURCE VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\\n📊 SUMMARY:`);
    console.log(`   Total resources tested: ${resources.length}`);
    console.log(`   Successfully accessible: ${successCount}`);
    console.log(`   Failed/inaccessible: ${resources.length - successCount}`);
    console.log(`   Success rate: ${((successCount / resources.length) * 100).toFixed(1)}%`);
    
    console.log(`\\n🔗 DETAILED RESULTS:`);
    validationResults.forEach((result, index) => {
      const status = result.accessible ? '✅' : '❌';
      console.log(`\\n${index + 1}. ${status} ${result.title}`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Status: ${result.responseCode} (${result.loadTime}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Provider analysis
    const providerStats: Record<string, { total: number; valid: number }> = {};
    validationResults.forEach(result => {
      if (!providerStats[result.provider]) {
        providerStats[result.provider] = { total: 0, valid: 0 };
      }
      providerStats[result.provider].total++;
      if (result.accessible) {
        providerStats[result.provider].valid++;
      }
    });
    
    console.log(`\\n🏢 PROVIDER ANALYSIS:`);
    Object.entries(providerStats).forEach(([provider, stats]) => {
      const rate = ((stats.valid / stats.total) * 100).toFixed(1);
      console.log(`   ${provider}: ${stats.valid}/${stats.total} (${rate}%)`);
    });
    
    console.log(`\\n✅ VALIDATION COMPLETE!`);
    console.log(`🔥 Grok API successfully discovered ${successCount} working course URLs!`);
    console.log('='.repeat(80) + '\\n');
    
    // Take final screenshot
    await page.goto('http://localhost:3001');
    await page.waitForSelector('select', { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/live-resource-test-complete.png' });
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testLiveResourceValidation().catch(console.error);