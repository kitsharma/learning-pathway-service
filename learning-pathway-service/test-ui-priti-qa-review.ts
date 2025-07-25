import puppeteer from 'puppeteer';
import fs from 'fs';

interface QATestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  userValue?: string;
  technicalNotes?: string;
}

interface ResourceQuality {
  provider: string;
  url: string;
  title: string;
  isDirectLink: boolean;
  isAccessible?: boolean;
  loadTime?: number;
  hasEnrollButton?: boolean;
  hasPriceInfo?: boolean;
  quality_score?: number;
}

async function runPritiQAReview() {
  console.log('🔍 Priti\'s QA Review - Learning Pathway Service');
  console.log('Focus: End-user value, search quality, API integration\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const testResults: QATestResult[] = [];
  const resourceAnalysis: ResourceQuality[] = [];
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Test 1: Application Load Test
    console.log('📋 Test 1: Application Load & Responsiveness');
    const startTime = Date.now();
    const response = await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    const loadTime = Date.now() - startTime;
    
    testResults.push({
      testName: 'Application Load Time',
      status: loadTime < 2000 ? 'PASS' : 'WARNING',
      details: `Page loaded in ${loadTime}ms`,
      userValue: loadTime < 2000 ? 'Fast load provides good user experience' : 'Slow load may frustrate users',
      technicalNotes: `Response status: ${response?.status()}`
    });
    
    // Test 2: UI Elements Present
    console.log('📋 Test 2: Core UI Elements');
    const hasRoleSelect = await page.$('select') !== null;
    const hasSkillInput = await page.$('button') !== null;
    
    testResults.push({
      testName: 'UI Elements Availability',
      status: hasRoleSelect && hasSkillInput ? 'PASS' : 'FAIL',
      details: `Role selector: ${hasRoleSelect}, Skill controls: ${hasSkillInput}`,
      userValue: 'Users can interact with career selection and skill input',
      technicalNotes: 'React components rendered correctly'
    });
    
    // Test 3: End-to-End Pathway Generation
    console.log('📋 Test 3: End-to-End Pathway Generation with Live APIs');
    
    // Add skill
    await page.evaluate(() => {
      const addButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Add Skill'));
      if (addButton) (addButton as HTMLButtonElement).click();
    });
    
    await page.waitForSelector('input[type="text"]', { timeout: 3000 });
    await page.type('input[type="text"]', 'Data Analytics');
    
    await page.evaluate(() => {
      const confirmButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Add');
      if (confirmButton) (confirmButton as HTMLButtonElement).click();
    });
    
    // Select role
    await page.select('select', 'AI-Enhanced Data Analyst');
    
    // Generate pathway
    console.log('   ⏳ Calling Grok API for live resources...');
    const pathwayStartTime = Date.now();
    
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (generateButton) (generateButton as HTMLButtonElement).click();
    });
    
    // Wait for results
    const pathwayGenerated = await page.waitForFunction(() => {
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      return skillGapSections.length > 0;
    }, { timeout: 30000 }).then(() => true).catch(() => false);
    
    const pathwayTime = Date.now() - pathwayStartTime;
    
    testResults.push({
      testName: 'Pathway Generation with Live APIs',
      status: pathwayGenerated ? 'PASS' : 'FAIL',
      details: `Generated in ${pathwayTime}ms`,
      userValue: pathwayGenerated ? 'Users receive personalized learning paths' : 'Failed to generate pathway',
      technicalNotes: 'Grok API integration status'
    });
    
    // Test 4: Resource Quality Analysis
    console.log('📋 Test 4: Resource Quality & Diversity Analysis');
    
    const resources = await page.evaluate(() => {
      const resourceCards = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4');
      const extractedResources: any[] = [];
      
      resourceCards.forEach(card => {
        const title = card.querySelector('h5')?.textContent || '';
        const provider = card.querySelector('.text-sm.text-gray-600')?.textContent || '';
        const link = card.querySelector('a')?.getAttribute('href') || '';
        const description = card.querySelector('p')?.textContent || '';
        
        if (title && link) {
          extractedResources.push({
            title,
            provider,
            url: link,
            description,
            isDirectLink: !link.includes('/search?') && !link.includes('/browse')
          });
        }
      });
      
      return extractedResources;
    });
    
    // Analyze provider diversity
    const providers = new Set(resources.map(r => r.provider));
    const directLinks = resources.filter(r => r.isDirectLink).length;
    
    testResults.push({
      testName: 'Resource Provider Diversity',
      status: providers.size >= 3 ? 'PASS' : 'WARNING',
      details: `${providers.size} unique providers: ${Array.from(providers).join(', ')}`,
      userValue: 'Diverse learning options give users choice',
      technicalNotes: `Total resources: ${resources.length}, Direct links: ${directLinks}`
    });
    
    // Test 5: URL Accessibility Spot Check
    console.log('📋 Test 5: Resource URL Quality Check');
    
    for (let i = 0; i < Math.min(resources.length, 3); i++) {
      const resource = resources[i];
      console.log(`   Testing: ${resource.title}...`);
      
      try {
        const testStart = Date.now();
        const response = await page.goto(resource.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        const testTime = Date.now() - testStart;
        
        const accessible = response?.status() && response.status() < 400;
        
        // Analyze page content
        const pageAnalysis = await page.evaluate(() => {
          const hasEnroll = !!Array.from(document.querySelectorAll('button, a'))
            .find(el => (el.textContent || '').toLowerCase().match(/enroll|start|begin|join/));
          
          const hasPrice = !!(
            document.body.textContent?.match(/\$\d+/) ||
            document.body.textContent?.toLowerCase().includes('free') ||
            document.body.textContent?.toLowerCase().includes('price')
          );
          
          return { hasEnroll, hasPrice };
        });
        
        resourceAnalysis.push({
          ...resource,
          isAccessible: accessible,
          loadTime: testTime,
          hasEnrollButton: pageAnalysis.hasEnroll,
          hasPriceInfo: pageAnalysis.hasPrice,
          quality_score: calculateQualityScore(resource, accessible || false, pageAnalysis)
        });
        
      } catch (error: any) {
        resourceAnalysis.push({
          ...resource,
          isAccessible: false,
          quality_score: 0
        });
      }
    }
    
    const accessibleResources = resourceAnalysis.filter(r => r.isAccessible).length;
    testResults.push({
      testName: 'Resource URL Accessibility',
      status: accessibleResources === resourceAnalysis.length ? 'PASS' : 'WARNING',
      details: `${accessibleResources}/${resourceAnalysis.length} URLs accessible`,
      userValue: 'Working links prevent user frustration',
      technicalNotes: 'Direct course pages vs search results pages'
    });
    
    // Generate Priti's QA Report
    console.log('\n' + '='.repeat(80));
    console.log('📊 PRITI\'S QA REVIEW SUMMARY');
    console.log('='.repeat(80));
    
    console.log('\n🎯 END USER VALUE ASSESSMENT:');
    const passedTests = testResults.filter(t => t.status === 'PASS').length;
    const overallScore = (passedTests / testResults.length) * 100;
    console.log(`Overall Quality Score: ${overallScore.toFixed(1)}%`);
    
    console.log('\n📋 DETAILED TEST RESULTS:');
    testResults.forEach((test, index) => {
      const icon = test.status === 'PASS' ? '✅' : test.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`\n${index + 1}. ${icon} ${test.testName}`);
      console.log(`   Status: ${test.status}`);
      console.log(`   Details: ${test.details}`);
      console.log(`   User Value: ${test.userValue}`);
      if (test.technicalNotes) {
        console.log(`   Technical: ${test.technicalNotes}`);
      }
    });
    
    console.log('\n🔗 RESOURCE QUALITY ANALYSIS:');
    resourceAnalysis.forEach((resource, index) => {
      console.log(`\n${index + 1}. ${resource.title}`);
      console.log(`   Provider: ${resource.provider}`);
      console.log(`   Direct Link: ${resource.isDirectLink ? 'Yes' : 'No (Search Page)'}`);
      console.log(`   Accessible: ${resource.isAccessible ? 'Yes' : 'No'}`);
      if (resource.loadTime) {
        console.log(`   Load Time: ${resource.loadTime}ms`);
      }
      console.log(`   Quality Score: ${resource.quality_score}/10`);
    });
    
    console.log('\n💡 PRITI\'S RECOMMENDATIONS:');
    
    if (overallScore >= 80) {
      console.log('✅ Service meets quality standards for production');
    } else {
      console.log('⚠️ Service needs improvement before production');
    }
    
    // Specific recommendations
    const recommendations: string[] = [];
    
    if (providers.size < 3) {
      recommendations.push('🔄 Increase provider diversity - users need more learning platform options');
    }
    
    if (directLinks < resources.length * 0.7) {
      recommendations.push('🔗 Prioritize direct course links over search pages for better UX');
    }
    
    if (accessibleResources < resourceAnalysis.length) {
      recommendations.push('🚨 Fix broken URLs - every dead link loses user trust');
    }
    
    const avgLoadTime = pathwayTime;
    if (avgLoadTime > 5000) {
      recommendations.push('⚡ Optimize API response time - users expect < 3s load times');
    }
    
    recommendations.forEach(rec => console.log(`   • ${rec}`));
    
    console.log('\n🎓 SEARCH QUALITY INSIGHTS:');
    console.log(`   • Grok API returning ${resources.length} resources per query`);
    console.log(`   • Provider distribution: ${JSON.stringify(Object.fromEntries(
      Array.from(providers).map(p => [p, resources.filter(r => r.provider === p).length])
    ))}`);
    console.log(`   • Direct vs Search URLs: ${directLinks}/${resources.length}`);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      overallScore,
      testResults,
      resourceAnalysis,
      recommendations,
      providerDiversity: Array.from(providers),
      apiPerformance: {
        pathwayGenerationTime: pathwayTime,
        resourceCount: resources.length,
        directLinkRatio: directLinks / resources.length
      }
    };
    
    fs.writeFileSync('priti-qa-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: priti-qa-report.json');
    
    // Take screenshot of final state
    await page.goto('http://localhost:3001');
    await page.screenshot({ path: 'screenshots/priti-qa-final-state.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ QA Test Suite Failed:', error);
    testResults.push({
      testName: 'Test Suite Execution',
      status: 'FAIL',
      details: `Critical error: ${error}`,
      userValue: 'Service unavailable to users'
    });
  } finally {
    await browser.close();
  }
  
  return testResults;
}

function calculateQualityScore(resource: any, accessible: boolean, pageAnalysis: any): number {
  let score = 0;
  
  if (accessible) score += 3;
  if (resource.isDirectLink) score += 3;
  if (pageAnalysis.hasEnroll) score += 2;
  if (pageAnalysis.hasPrice) score += 1;
  if (resource.provider.includes('Coursera') || resource.provider.includes('edX')) score += 1;
  
  return Math.min(score, 10);
}

// Run Priti's QA Review
runPritiQAReview().catch(console.error);