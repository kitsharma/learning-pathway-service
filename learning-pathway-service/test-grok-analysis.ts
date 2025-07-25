import puppeteer from 'puppeteer';

async function testGrokSearchAnalysis() {
  console.log('🔍 GROK SEARCH ANALYSIS TEST\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Test Grok API directly first
    console.log('📡 Step 1: Direct Grok API Test...');
    const grokResponse = await testGrokAPI('Machine Learning');
    console.log('Grok Response Analysis:');
    console.log('- Response length:', grokResponse.length);
    console.log('- Contains Coursera:', grokResponse.includes('coursera'));
    console.log('- Contains Udemy:', grokResponse.includes('udemy'));
    console.log('- Contains edX:', grokResponse.includes('edx'));
    console.log('- Contains Universities:', grokResponse.includes('university') || grokResponse.includes('edu'));
    console.log('- Contains working URLs:', grokResponse.includes('https://'));
    
    const page = await browser.newPage();
    
    // Navigate to application and get resources
    console.log('\n📍 Step 2: Loading application and extracting resources...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Clear existing and add test skill
    await page.evaluate(() => {
      const addButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Add Skill'));
      if (addButton) (addButton as HTMLButtonElement).click();
    });
    
    await page.waitForSelector('input[type="text"]', { timeout: 3000 });
    await page.type('input[type="text"]', 'Data Science');
    
    await page.evaluate(() => {
      const confirmButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Add');
      if (confirmButton) (confirmButton as HTMLButtonElement).click();
    });
    
    await page.select('select', 'AI-Enhanced Data Analyst');
    
    console.log('📍 Step 3: Generating pathway and analyzing results...');
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
    
    // Extract resources with detailed analysis
    const resourcesAnalysis = await page.evaluate(() => {
      const resourceCards = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4');
      const resources: any[] = [];
      
      resourceCards.forEach(card => {
        const title = card.querySelector('h5')?.textContent || '';
        const provider = card.querySelector('.text-sm.text-gray-600')?.textContent || '';
        const link = card.querySelector('a')?.getAttribute('href') || '';
        const description = card.querySelector('p')?.textContent || '';
        
        if (title && link) {
          resources.push({
            title,
            provider,
            url: link,
            description,
            isDirect: !link.includes('/search'),
            isUniversity: provider.toLowerCase().includes('university') || link.includes('.edu'),
            isCoursera: provider.toLowerCase().includes('coursera'),
            isUdemy: provider.toLowerCase().includes('udemy'),
            isEdx: provider.toLowerCase().includes('edx'),
            isMicrosoft: provider.toLowerCase().includes('microsoft'),
            isLinkedIn: provider.toLowerCase().includes('linkedin')
          });
        }
      });
      
      return resources;
    });
    
    console.log(`\n📊 RESOURCE ANALYSIS (${resourcesAnalysis.length} total):`);
    
    // Provider breakdown
    const providerStats = {
      coursera: resourcesAnalysis.filter(r => r.isCoursera).length,
      udemy: resourcesAnalysis.filter(r => r.isUdemy).length,
      edx: resourcesAnalysis.filter(r => r.isEdx).length,
      microsoft: resourcesAnalysis.filter(r => r.isMicrosoft).length,
      linkedin: resourcesAnalysis.filter(r => r.isLinkedIn).length,
      university: resourcesAnalysis.filter(r => r.isUniversity).length,
      directLinks: resourcesAnalysis.filter(r => r.isDirect).length,
      searchPages: resourcesAnalysis.filter(r => !r.isDirect).length
    };
    
    console.log('\n🏢 PROVIDER BREAKDOWN:');
    console.log(`   Coursera: ${providerStats.coursera}`);
    console.log(`   Udemy: ${providerStats.udemy}`);
    console.log(`   edX: ${providerStats.edx}`);
    console.log(`   Microsoft Learn: ${providerStats.microsoft}`);
    console.log(`   LinkedIn Learning: ${providerStats.linkedin}`);
    console.log(`   Universities: ${providerStats.university}`);
    
    console.log('\n🔗 LINK QUALITY:');
    console.log(`   Direct course links: ${providerStats.directLinks}`);
    console.log(`   Search page links: ${providerStats.searchPages}`);
    
    console.log('\n📝 SAMPLE RESOURCES:');
    resourcesAnalysis.slice(0, 5).forEach((resource, index) => {
      console.log(`\n${index + 1}. ${resource.title}`);
      console.log(`   Provider: ${resource.provider}`);
      console.log(`   URL: ${resource.url}`);
      console.log(`   Direct Link: ${resource.isDirect ? 'Yes' : 'No'}`);
      console.log(`   Description: ${resource.description.substring(0, 100)}...`);
    });
    
    // Now test actual URL accessibility
    console.log('\n📍 Step 4: Testing URL accessibility...');
    let accessibleCount = 0;
    
    for (let i = 0; i < Math.min(resourcesAnalysis.length, 5); i++) {
      const resource = resourcesAnalysis[i];
      try {
        console.log(`   Testing: ${resource.title}...`);
        const response = await page.goto(resource.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response?.status() && response.status() < 400) {
          accessibleCount++;
          
          // Analyze page content
          const pageContent = await page.evaluate(() => {
            const title = document.title;
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => h.textContent?.trim())
              .filter(t => t && t.length > 0)
              .slice(0, 3);
            
            const hasEnrollButton = !!Array.from(document.querySelectorAll('button, a'))
              .find(el => (el.textContent || '').toLowerCase().includes('enroll'));
            
            const hasPrice = !!(
              document.body.textContent?.includes('$') ||
              document.body.textContent?.toLowerCase().includes('free') ||
              document.body.textContent?.toLowerCase().includes('paid')
            );
            
            return {
              title,
              headings,
              hasEnrollButton,
              hasPrice,
              bodyLength: document.body.textContent?.length || 0
            };
          });
          
          console.log(`     ✅ Accessible - ${pageContent.title}`);
          console.log(`     Headings: ${pageContent.headings.join(', ')}`);
          console.log(`     Has Enroll: ${pageContent.hasEnrollButton}`);
          console.log(`     Has Price Info: ${pageContent.hasPrice}`);
        } else {
          console.log(`     ❌ Not accessible - Status: ${response?.status()}`);
        }
      } catch (error: any) {
        console.log(`     ❌ Error - ${error.message.substring(0, 50)}`);
      }
    }
    
    console.log(`\n📈 FINAL SUMMARY:`);
    console.log(`   Total resources found: ${resourcesAnalysis.length}`);
    console.log(`   Accessible URLs tested: ${accessibleCount}/5`);
    console.log(`   Success rate: ${((accessibleCount/5) * 100).toFixed(1)}%`);
    console.log(`   Grok returns diverse providers: ${providerStats.coursera > 0 && providerStats.udemy > 0 ? 'Yes' : 'No'}`);
    console.log(`   University content included: ${providerStats.university > 0 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

async function testGrokAPI(skillName: string): Promise<string> {
  const xaiApiKey = process.env.XAI_API_KEY || '';
  const xaiApiBase = process.env.X_AI_API_BASE || 'https://api.x.ai/v1';
  
  const searchPrompt = `Find 5 online courses for "${skillName}" from diverse providers including Coursera, Udemy, edX, university programs, and other quality platforms. Include exact URLs.`;
  
  try {
    const response = await fetch(`${xaiApiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that finds current online learning resources from diverse providers.'
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
    
  } catch (error: any) {
    console.warn('Grok API test failed:', error.message);
    return '';
  }
}

testGrokSearchAnalysis().catch(console.error);