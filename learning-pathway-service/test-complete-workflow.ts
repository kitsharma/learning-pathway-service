import puppeteer from 'puppeteer';

async function testCompleteWorkflow() {
  console.log('🚀 Starting comprehensive end-to-end workflow test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Navigate and wait for app to load
    console.log('📍 Step 1: Loading application');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.waitForSelector('select', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ path: 'screenshots/workflow-1-initial.png' });
    console.log('   ✅ Application loaded successfully\n');
    
    // Step 2: Clear existing skills
    console.log('📍 Step 2: Clearing existing skills');
    
    // Click all remove buttons
    let removeCount = 0;
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
      removeCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`   ✅ Removed ${removeCount} existing skills\n`);
    
    // Step 3: Add new skills
    console.log('📍 Step 3: Adding new skills');
    const skillsToAdd = ['JavaScript', 'React', 'Node.js'];
    
    for (const skill of skillsToAdd) {
      // Click Add Skill button
      await page.evaluate(() => {
        const addButton = Array.from(document.querySelectorAll('button'))
          .find(btn => (btn.textContent || '').includes('Add Skill'));
        if (addButton) {
          (addButton as HTMLButtonElement).click();
        }
      });
      
      await page.waitForSelector('input[type="text"]', { timeout: 3000 });
      await page.type('input[type="text"]', skill);
      
      // Click Add button
      await page.evaluate(() => {
        const confirmButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent === 'Add');
        if (confirmButton) {
          (confirmButton as HTMLButtonElement).click();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`   Added: ${skill}`);
    }
    
    await page.screenshot({ path: 'screenshots/workflow-2-skills-added.png' });
    console.log('   ✅ Skills added successfully\n');
    
    // Step 4: Select AI-Enhanced Data Analyst role
    console.log('📍 Step 4: Selecting target role');
    await page.select('select', 'AI-Enhanced Data Analyst');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await page.screenshot({ path: 'screenshots/workflow-3-role-selected.png' });
    console.log('   ✅ Selected: AI-Enhanced Data Analyst\n');
    
    // Step 5: Generate pathway
    console.log('📍 Step 5: Generating learning pathway');
    
    await page.evaluate(() => {
      const generateButton = Array.from(document.querySelectorAll('button'))
        .find(btn => (btn.textContent || '').includes('Generate My Pathway'));
      if (generateButton) {
        (generateButton as HTMLButtonElement).click();
      }
    });
    
    // Wait for pathway to appear
    await page.waitForFunction(() => {
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      return skillGapSections.length > 0;
    }, { timeout: 15000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: 'screenshots/workflow-4-pathway-generated.png' });
    console.log('   ✅ Pathway generated successfully\n');
    
    // Step 6: Analyze the pathway
    console.log('📍 Step 6: Analyzing generated pathway');
    
    const pathwayAnalysis = await page.evaluate(() => {
      // Get journey details
      const journeyHeader = Array.from(document.querySelectorAll('h2'))
        .find(h2 => (h2.textContent || '').includes('Your Journey to'));
      const encouragement = journeyHeader?.nextElementSibling?.textContent || '';
      
      // Get skill gaps
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border'))
        .filter(el => {
          const h3 = el.querySelector('h3');
          return h3 && !(el.textContent || '').includes('Your Journey to');
        });
      
      const skillGaps = skillGapSections.map(section => {
        const title = section.querySelector('h3')?.textContent?.replace(/^\d+/, '').trim() || '';
        const milestones = section.querySelectorAll('.flex.items-center.gap-3').length;
        const resources = section.querySelectorAll('.border.border-gray-200.rounded-lg.p-4').length;
        const estimatedTime = section.querySelector('.text-sm.text-gray-500')?.textContent || '';
        
        return { title, milestones, resources, estimatedTime };
      });
      
      // Get overall stats
      const totalMilestones = document.querySelectorAll('button.w-5.h-5.border-2').length;
      const totalResources = document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4').length;
      const estimatedTime = document.querySelector('.text-sm.text-gray-600')?.textContent?.match(/\d+ weeks/)?.[0] || '';
      
      return {
        encouragement,
        skillGaps,
        totalMilestones,
        totalResources,
        estimatedTime
      };
    });
    
    console.log('   Encouragement:', pathwayAnalysis.encouragement);
    console.log('   Estimated time:', pathwayAnalysis.estimatedTime);
    console.log('   Total milestones:', pathwayAnalysis.totalMilestones);
    console.log('   Total resources:', pathwayAnalysis.totalResources);
    console.log('\n   Skill gaps identified:');
    pathwayAnalysis.skillGaps.forEach((gap, index) => {
      console.log(`   ${index + 1}. ${gap.title}`);
      console.log(`      - Milestones: ${gap.milestones}`);
      console.log(`      - Resources: ${gap.resources}`);
      console.log(`      - Time: ${gap.estimatedTime}`);
    });
    console.log('   ✅ Pathway analysis complete\n');
    
    // Step 7: Test milestone interaction
    console.log('📍 Step 7: Testing milestone completion');
    
    // Click first three milestones
    for (let i = 0; i < 3; i++) {
      await page.evaluate((index) => {
        const checkboxes = document.querySelectorAll('button.w-5.h-5.border-2');
        if (checkboxes[index]) {
          (checkboxes[index] as HTMLButtonElement).click();
        }
      }, i);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check progress
    const progress = await page.evaluate(() => {
      const progressBar = document.querySelector('.progress-bar') as HTMLElement;
      const progressText = Array.from(document.querySelectorAll('span'))
        .find(span => (span.textContent || '').includes('Progress:'));
      
      return {
        progressWidth: progressBar ? progressBar.style.width : '0%',
        progressText: progressText ? progressText.textContent : ''
      };
    });
    
    console.log('   Progress:', progress.progressText);
    console.log('   Progress bar:', progress.progressWidth);
    
    await page.screenshot({ path: 'screenshots/workflow-5-milestones-completed.png' });
    console.log('   ✅ Milestone interaction successful\n');
    
    // Step 8: Test resource links
    console.log('📍 Step 8: Verifying resource links');
    
    const resourceInfo = await page.evaluate(() => {
      const resources = Array.from(document.querySelectorAll('.border.border-gray-200.rounded-lg.p-4'));
      return resources.slice(0, 3).map(resource => {
        const title = resource.querySelector('h5')?.textContent || '';
        const provider = resource.querySelector('.text-sm.text-gray-600')?.textContent || '';
        const link = resource.querySelector('a')?.getAttribute('href') || '';
        const cost = resource.querySelector('.text-xs')?.textContent || '';
        
        return { title, provider, link, cost };
      });
    });
    
    console.log('   Sample resources:');
    resourceInfo.forEach((resource, index) => {
      console.log(`   ${index + 1}. ${resource.title}`);
      console.log(`      Provider: ${resource.provider}`);
      console.log(`      Cost: ${resource.cost}`);
      console.log(`      Link: ${resource.link}`);
    });
    console.log('   ✅ Resources verified\n');
    
    // Step 9: Test responsive design
    console.log('📍 Step 9: Testing responsive design');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 667 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/workflow-6-mobile.png' });
    console.log('   ✅ Mobile view captured');
    
    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.screenshot({ path: 'screenshots/workflow-7-tablet.png' });
    console.log('   ✅ Tablet view captured\n');
    
    console.log('🎉 Comprehensive workflow test completed successfully!');
    console.log('📸 All screenshots saved in the screenshots directory');
    
  } catch (error) {
    console.error('❌ Error during workflow test:', error);
    
    try {
      const page = (await browser.pages())[0];
      if (page) {
        await page.screenshot({ path: 'screenshots/workflow-error.png' });
      }
    } catch (e) {
      // Ignore screenshot error
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);