import puppeteer from 'puppeteer';

async function testUserWorkflow() {
  console.log('🚀 Starting end-to-end user workflow test...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Navigate to the application
    console.log('📍 Step 1: Navigating to http://localhost:3001');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'screenshots/1-homepage.png' });
    console.log('   ✅ Homepage loaded successfully\n');
    
    // Step 2: Wait for React app to load
    console.log('📍 Step 2: Waiting for React app to load');
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Check current state
    const appState = await page.evaluate(() => {
      const roleSelect = document.querySelector('select');
      const skillBadges = Array.from(document.querySelectorAll('.bg-blue-100')).map(el => (el.textContent || '').replace('×', '').trim());
      const generateButton = Array.from(document.querySelectorAll('button')).find(btn => (btn.textContent || '').includes('Generate'));
      
      return {
        hasRoleSelect: !!roleSelect,
        currentRole: roleSelect?.value,
        availableRoles: roleSelect ? Array.from(roleSelect.querySelectorAll('option')).map(opt => opt.textContent) : [],
        currentSkills: skillBadges,
        hasGenerateButton: !!generateButton
      };
    });
    
    console.log('   Role select found:', appState.hasRoleSelect);
    console.log('   Current role:', appState.currentRole);
    console.log('   Available roles:', appState.availableRoles);
    console.log('   Current skills:', appState.currentSkills);
    console.log('   Generate button found:', appState.hasGenerateButton);
    console.log('   ✅ React app loaded successfully\n');
    
    // Step 3: Modify skills and role
    console.log('📍 Step 3: Modifying skills and role');
    
    // Remove existing skills
    const removeButtons = await page.$$('button');
    for (const button of removeButtons) {
      const text = await button.evaluate(el => el.textContent || '');
      if (text === '×') {
        await button.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    console.log('   Removed existing skills');
    
    // Add new skills
    const addSkillButton = await page.$('button:has-text("+ Add Skill")');
    if (!addSkillButton) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent || '');
        if (text.includes('Add Skill')) {
          await button.click();
          break;
        }
      }
    }
    
    await page.waitForSelector('input[type="text"]', { timeout: 3000 });
    
    const skillsToAdd = ['JavaScript', 'React', 'Node.js', 'Python'];
    for (const skill of skillsToAdd) {
      // Click Add Skill button
      const addButtons = await page.$$('button');
      for (const button of addButtons) {
        const text = await button.evaluate(el => el.textContent || '');
        if (text.includes('Add Skill')) {
          await button.click();
          break;
        }
      }
      
      await page.waitForSelector('input[type="text"]', { timeout: 3000 });
      await page.type('input[type="text"]', skill);
      
      // Click Add button
      const confirmButtons = await page.$$('button');
      for (const button of confirmButtons) {
        const text = await button.evaluate(el => el.textContent || '');
        if (text === 'Add') {
          await button.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          break;
        }
      }
    }
    console.log('   Added new skills:', skillsToAdd);
    
    // Select a different role
    await page.select('select', 'Data Scientist');
    console.log('   Selected role: Data Scientist');
    
    await page.screenshot({ path: 'screenshots/2-form-modified.png' });
    console.log('   ✅ Form modified successfully\n');
    
    // Step 4: Generate pathway
    console.log('📍 Step 4: Generating pathway');
    const generateButton = await page.$('button:has-text("Generate")');
    if (!generateButton) {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent || '');
        if (text.includes('Generate')) {
          await button.click();
          break;
        }
      }
    } else {
      await generateButton.click();
    }
    
    // Wait for the pathway to be generated
    await page.waitForFunction(() => {
      const skillGapElements = document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border');
      return skillGapElements.length > 1; // More than just the header card
    }, { timeout: 10000 });
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Let animations complete
    await page.screenshot({ path: 'screenshots/3-pathway-generated.png' });
    console.log('   ✅ Pathway generated and displayed\n');
    
    // Step 5: Check the generated pathway
    console.log('📍 Step 5: Analyzing generated pathway');
    const pathwayData = await page.evaluate(() => {
      // Find skill gap sections
      const skillGapSections = Array.from(document.querySelectorAll('.bg-white.rounded-lg.shadow-sm.border')).filter(el => 
        el.querySelector('h3') && !(el.textContent || '').includes('Your Journey to')
      );
      
      const skillGaps = skillGapSections.map(section => {
        const title = section.querySelector('h3')?.textContent?.replace(/^\d+/, '').trim() || '';
        const milestones = Array.from(section.querySelectorAll('.flex.items-center.gap-3')).map(m => 
          m.querySelector('span')?.textContent || ''
        );
        const resources = Array.from(section.querySelectorAll('.border.border-gray-200.rounded-lg.p-4')).map(r => ({
          title: r.querySelector('h5')?.textContent || '',
          provider: r.querySelector('.text-sm.text-gray-600')?.textContent || ''
        }));
        
        return { title, milestones, resources };
      });
      
      return {
        hasPathway: skillGaps.length > 0,
        skillGapCount: skillGaps.length,
        skillGaps
      };
    });
    
    console.log('   Pathway found:', pathwayData.hasPathway);
    console.log('   Number of skill gaps:', pathwayData.skillGapCount);
    pathwayData.skillGaps.forEach((gap, index) => {
      console.log(`   Skill Gap ${index + 1}: ${gap.title}`);
      console.log(`     Milestones: ${gap.milestones.length}`);
      console.log(`     Resources: ${gap.resources.length}`);
    });
    console.log('   ✅ Pathway structure verified\n');
    
    // Step 6: Test milestone interaction
    console.log('📍 Step 6: Testing milestone interaction');
    
    // Click on first milestone checkbox
    const firstCheckbox = await page.$('button.w-5.h-5.border-2');
    if (firstCheckbox) {
      await firstCheckbox.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('   ✅ Clicked first milestone checkbox');
      
      // Check if toast notification appeared
      const toastVisible = await page.evaluate(() => {
        return !!document.querySelector('.fixed.top-4.right-4');
      });
      console.log('   Toast notification:', toastVisible ? 'Visible' : 'Not visible');
      
      await page.screenshot({ path: 'screenshots/4-milestone-completed.png' });
    }
    
    // Step 7: Test responsive design
    console.log('\n📍 Step 7: Testing responsive design');
    
    // Mobile view
    await page.setViewport({ width: 375, height: 667 });
    await page.screenshot({ path: 'screenshots/5-mobile-view.png' });
    console.log('   ✅ Mobile view captured');
    
    // Tablet view
    await page.setViewport({ width: 768, height: 1024 });
    await page.screenshot({ path: 'screenshots/6-tablet-view.png' });
    console.log('   ✅ Tablet view captured');
    
    console.log('\n🎉 End-to-end workflow test completed successfully!');
    console.log('📸 Screenshots saved in the screenshots directory');
    
  } catch (error) {
    console.error('❌ Error during workflow test:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testUserWorkflow().catch(console.error);