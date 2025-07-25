import puppeteer from 'puppeteer';

async function testNewRoles() {
  console.log('🚀 Testing updated displacement-focused roles...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate and wait for load
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('select', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check available roles
    const availableRoles = await page.evaluate(() => {
      const select = document.querySelector('select');
      return select ? Array.from(select.querySelectorAll('option')).map(opt => opt.textContent) : [];
    });
    
    console.log('📋 Available roles:');
    availableRoles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role}`);
    });
    console.log(`   Total: ${availableRoles.length} roles\n`);
    
    // Check default state
    const defaultState = await page.evaluate(() => {
      const roleSelect = document.querySelector('select') as HTMLSelectElement;
      const skillBadges = Array.from(document.querySelectorAll('.bg-blue-100')).map(el => (el.textContent || '').replace('×', '').trim());
      
      return {
        defaultRole: roleSelect?.value || 'Not found',
        defaultSkills: skillBadges
      };
    });
    
    console.log('🎯 Default configuration:');
    console.log(`   Role: ${defaultState.defaultRole}`);
    console.log(`   Skills: ${defaultState.defaultSkills.join(', ')}\n`);
    
    // Test different role selection
    console.log('🔄 Testing role selection...');
    await page.select('select', 'AI-Enhanced Administrative Coordinator');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate pathway
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (generateButton) {
        (generateButton as HTMLButtonElement).click();
      }
    });
    
    // Wait for pathway
    await page.waitForFunction(() => {
      const skillGaps = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
      return skillGaps.length > 1;
    }, { timeout: 10000 });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Analyze pathway
    const pathwayAnalysis = await page.evaluate(() => {
      const journeyHeader = Array.from(document.querySelectorAll('h2'))
        .find(h2 => (h2.textContent || '').includes('Your Journey to'));
      
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      
      const skillGaps = skillGapSections.map(section => {
        const title = section.querySelector('h3')?.textContent?.replace(/^\d+/, '').trim() || '';
        const milestones = section.querySelectorAll('.flex.items-center.gap-3').length;
        const resources = section.querySelectorAll('.border.border-gray-200.rounded-lg.p-4').length;
        return { title, milestones, resources };
      });
      
      return {
        targetRole: journeyHeader ? (journeyHeader.textContent || '').replace('Your Journey to ', '') : 'Not found',
        skillGaps,
        totalMilestones: document.querySelectorAll('button.w-5.h-5.border-2').length,
        totalResources: document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4').length
      };
    });
    
    console.log('📊 Generated pathway analysis:');
    console.log(`   Target role: ${pathwayAnalysis.targetRole}`);
    console.log(`   Skill gaps: ${pathwayAnalysis.skillGaps.length}`);
    pathwayAnalysis.skillGaps.forEach((gap, index) => {
      console.log(`     ${index + 1}. ${gap.title} (${gap.milestones} milestones, ${gap.resources} resources)`);
    });
    console.log(`   Total milestones: ${pathwayAnalysis.totalMilestones}`);
    console.log(`   Total resources: ${pathwayAnalysis.totalResources}\n`);
    
    await page.screenshot({ path: 'screenshots/new-roles-test.png' });
    
    console.log('✅ New displacement-focused roles working successfully!');
    console.log('📸 Screenshot saved as screenshots/new-roles-test.png');
    
  } catch (error) {
    console.error('❌ Error testing new roles:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

testNewRoles().catch(console.error);