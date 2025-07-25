import puppeteer from 'puppeteer';

async function testEnhancedSearch() {
  console.log('🔍 Testing Enhanced Search Functionality');
  console.log('Focus: Microsoft Learn, Coursera, and edX custom search URLs\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('📍 Step 1: Loading application...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Test with AI Scheduling skill to trigger the new Microsoft Learn search
    console.log('📍 Step 2: Testing AI Scheduling skill for Microsoft Learn...');
    
    // Clear existing skills
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
    
    // Add AI Scheduling skill to test Microsoft Learn search
    await page.evaluate(() => {
      const addButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Add Skill'));
      if (addButton) (addButton as HTMLButtonElement).click();
    });
    
    await page.waitForSelector('input[type="text"]', { timeout: 3000 });
    await page.type('input[type="text"]', 'AI-Assisted Scheduling');
    
    await page.evaluate(() => {
      const confirmButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Add');
      if (confirmButton) (confirmButton as HTMLButtonElement).click();
    });
    
    await page.select('select', 'AI-Enhanced Administrative Coordinator');
    
    console.log('📍 Step 3: Generating pathway to test enhanced search URLs...');
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (generateButton) (generateButton as HTMLButtonElement).click();
    });
    
    // Wait for results
    await page.waitForFunction(() => {
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      return skillGapSections.length > 0;
    }, { timeout: 30000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📍 Step 4: Extracting and analyzing enhanced search URLs...');
    
    // Extract resources with detailed URL analysis
    const resourcesAnalysis = await page.evaluate(() => {
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
            url: link,
            isCustomSearch: link.includes('terms=') || link.includes('query=') || link.includes('?q='),
            isMicrosoftLearn: provider.toLowerCase().includes('microsoft'),
            isCoursera: provider.toLowerCase().includes('coursera'),
            isEdx: provider.toLowerCase().includes('edx')
          });
        }
      });
      
      return extractedResources;
    });
    
    console.log(`\n📊 ENHANCED SEARCH ANALYSIS (${resourcesAnalysis.length} resources):`);
    
    // Analyze Microsoft Learn URLs
    const msLearnResources = resourcesAnalysis.filter(r => r.isMicrosoftLearn);
    const courseraResources = resourcesAnalysis.filter(r => r.isCoursera);
    const edxResources = resourcesAnalysis.filter(r => r.isEdx);
    
    console.log('\n🔍 MICROSOFT LEARN SEARCH ANALYSIS:');
    msLearnResources.forEach((resource, index) => {
      console.log(`   ${index + 1}. ${resource.title}`);
      console.log(`      URL: ${resource.url}`);
      console.log(`      Custom Search: ${resource.isCustomSearch ? 'Yes' : 'No'}`);
      
      if (resource.url.includes('terms=')) {
        const searchTerms = resource.url.split('terms=')[1];
        const decodedTerms = decodeURIComponent(searchTerms.split('&')[0]).replace(/%20/g, ' ');
        console.log(`      Search Terms: "${decodedTerms}"`);
      }
    });
    
    console.log('\n🎓 COURSERA SEARCH ANALYSIS:');
    courseraResources.forEach((resource, index) => {
      console.log(`   ${index + 1}. ${resource.title}`);
      console.log(`      URL: ${resource.url}`);
      console.log(`      Custom Search: ${resource.isCustomSearch ? 'Yes' : 'No'}`);
      
      if (resource.url.includes('query=')) {
        const searchQuery = resource.url.split('query=')[1];
        const decodedQuery = decodeURIComponent(searchQuery.split('&')[0]).replace(/\+/g, ' ');
        console.log(`      Search Query: "${decodedQuery}"`);
      }
    });
    
    console.log('\n🏛️ EDX SEARCH ANALYSIS:');
    edxResources.forEach((resource, index) => {
      console.log(`   ${index + 1}. ${resource.title}`);
      console.log(`      URL: ${resource.url}`);
      console.log(`      Custom Search: ${resource.isCustomSearch ? 'Yes' : 'No'}`);
      
      if (resource.url.includes('?q=')) {
        const searchQuery = resource.url.split('?q=')[1];
        const decodedQuery = decodeURIComponent(searchQuery.split('&')[0]).replace(/\+/g, ' ');
        console.log(`      Search Query: "${decodedQuery}"`);
      }
    });
    
    // Test a few URLs
    console.log('\n📍 Step 5: Testing custom search URLs...');
    
    const urlsToTest = [
      ...msLearnResources.slice(0, 1),
      ...courseraResources.slice(0, 1),
      ...edxResources.slice(0, 1)
    ];
    
    for (const resource of urlsToTest) {
      console.log(`\n   Testing: ${resource.title}...`);
      try {
        const response = await page.goto(resource.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response?.status() && response.status() < 400) {
          const pageTitle = await page.title();
          console.log(`     ✅ Success: ${pageTitle}`);
          
          // Check if it's a search results page
          const isSearchPage = await page.evaluate(() => {
            const pageText = document.body.textContent?.toLowerCase() || '';
            return pageText.includes('search results') || 
                   pageText.includes('results for') ||
                   pageText.includes('showing') ||
                   document.querySelectorAll('.search-result, .result-item').length > 0;
          });
          
          console.log(`     Search Results Page: ${isSearchPage ? 'Yes' : 'No'}`);
        } else {
          console.log(`     ❌ Failed: Status ${response?.status()}`);
        }
      } catch (error: any) {
        console.log(`     ❌ Error: ${error.message.substring(0, 50)}`);
      }
    }
    
    console.log('\n✅ ENHANCED SEARCH TEST COMPLETE!');
    console.log(`📊 Found ${msLearnResources.length} Microsoft Learn, ${courseraResources.length} Coursera, ${edxResources.length} edX resources`);
    console.log(`🔍 Custom search URLs generated for intelligent course discovery`);
    
  } catch (error) {
    console.error('❌ Enhanced search test failed:', error);
  } finally {
    await browser.close();
  }
}

testEnhancedSearch().catch(console.error);