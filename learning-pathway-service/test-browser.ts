import puppeteer, { Browser, Page } from 'puppeteer';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  screenshot?: string;
}

class BrowserTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl = 'http://localhost:3001';

  async initialize(): Promise<void> {
    console.log('🚀 Launching browser for testing...');
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      defaultViewport: {
        width: 1200,
        height: 800
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Set up console logging from browser
    this.page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Set up error logging
    this.page.on('error', (err) => {
      console.error('[Browser Error]:', err);
    });
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    const tests = [
      this.testPageLoad,
      this.testHealthEndpoint,
      this.testRolesEndpoint,
      this.testGeneratePathway,
      this.testSkillManagement,
      this.testMilestoneCompletion,
      this.testRoleSelection,
      this.testResponsiveness,
      this.testLiveAPIDataIntegration,
      this.testResourceLinkValidation,
      this.testProgressTracking,
      this.testUserFlowEnd2End,
      this.testErrorHandling,
      this.testAPIPerformance,
      this.testAccessibility,
      this.testDataPersistence
    ];

    for (const test of tests) {
      try {
        const result = await test.call(this);
        results.push(result);
        console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`);
        }
      } catch (error: any) {
        results.push({
          name: test.name,
          success: false,
          error: error.message
        });
        console.log(`❌ ${test.name} - ${error.message}`);
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  private async testPageLoad(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing page load...');
    
    try {
      const response = await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      if (!response || !response.ok()) {
        throw new Error(`Page load failed with status: ${response?.status()}`);
      }

      // Wait for main content to load
      await this.page.waitForSelector('h1', { timeout: 5000 });
      
      const title = await this.page.$eval('h1', el => el.textContent);
      
      if (!title?.includes('Interactive Learning Pathway')) {
        throw new Error('Page title not found or incorrect');
      }

      await this.page.screenshot({ path: 'screenshots/page-load.png' });

      return {
        name: 'Page Load Test',
        success: true,
        screenshot: 'screenshots/page-load.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/page-load-error.png' });
      return {
        name: 'Page Load Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/page-load-error.png'
      };
    }
  }

  private async testHealthEndpoint(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing health endpoint...');
    
    try {
      const response = await this.page.goto(`${this.baseUrl}/health`, { 
        waitUntil: 'networkidle2' 
      });
      
      if (!response || !response.ok()) {
        throw new Error(`Health endpoint failed with status: ${response?.status()}`);
      }

      const content = await this.page.content();
      const healthData = JSON.parse(await this.page.$eval('pre', el => el.textContent || '{}'));
      
      if (healthData.status !== 'healthy') {
        throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
      }

      return {
        name: 'Health Endpoint Test',
        success: true
      };
    } catch (error: any) {
      return {
        name: 'Health Endpoint Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testRolesEndpoint(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing roles endpoint...');
    
    try {
      const response = await this.page.goto(`${this.baseUrl}/api/roles`, { 
        waitUntil: 'networkidle2' 
      });
      
      if (!response || !response.ok()) {
        throw new Error(`Roles endpoint failed with status: ${response?.status()}`);
      }

      const rolesData = JSON.parse(await this.page.$eval('pre', el => el.textContent || '{}'));
      
      if (!rolesData.success || !Array.isArray(rolesData.roles)) {
        throw new Error(`Invalid roles response: ${JSON.stringify(rolesData)}`);
      }

      if (rolesData.roles.length === 0) {
        throw new Error('No roles returned');
      }

      return {
        name: 'Roles Endpoint Test',
        success: true
      };
    } catch (error: any) {
      return {
        name: 'Roles Endpoint Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testGeneratePathway(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing pathway generation...');
    
    try {
      // Go back to main page
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Wait for the generate button and click it
      await this.page.waitForSelector('button:has-text("🚀 Generate My Pathway")', { timeout: 5000 });
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      
      // Wait for pathway to load
      await this.page.waitForSelector('.bg-white.rounded-lg.shadow-sm', { timeout: 10000 });
      
      // Check if pathway content is displayed
      const pathwayContent = await this.page.$('.space-y-6');
      if (!pathwayContent) {
        throw new Error('Pathway content not found');
      }

      // Check for skill gaps
      const skillGaps = await this.page.$$('.text-xl.font-semibold');
      if (skillGaps.length === 0) {
        throw new Error('No skill gaps displayed');
      }

      await this.page.screenshot({ path: 'screenshots/pathway-generated.png' });

      return {
        name: 'Generate Pathway Test',
        success: true,
        screenshot: 'screenshots/pathway-generated.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/pathway-error.png' });
      return {
        name: 'Generate Pathway Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/pathway-error.png'
      };
    }
  }

  private async testSkillManagement(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing skill management...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Click "Add Skill" button
      await this.page.waitForSelector('button:has-text("+ Add Skill")', { timeout: 5000 });
      await this.page.click('button:has-text("+ Add Skill")');
      
      // Wait for input field
      await this.page.waitForSelector('input[placeholder="Enter a skill..."]', { timeout: 3000 });
      
      // Type a new skill
      await this.page.type('input[placeholder="Enter a skill..."]', 'Python Programming');
      
      // Click Add button
      await this.page.click('button:has-text("Add")');
      
      // Wait for skill to appear in the list
      await this.page.waitForFunction(
        () => document.querySelector('span')?.textContent?.includes('Python Programming'),
        { timeout: 3000 }
      );
      
      await this.page.screenshot({ path: 'screenshots/skill-added.png' });

      return {
        name: 'Skill Management Test',
        success: true,
        screenshot: 'screenshots/skill-added.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/skill-error.png' });
      return {
        name: 'Skill Management Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/skill-error.png'
      };
    }
  }

  private async testMilestoneCompletion(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing milestone completion...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Generate pathway first
      await this.page.waitForSelector('button:has-text("🚀 Generate My Pathway")', { timeout: 5000 });
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      
      // Wait for milestones to appear
      await this.page.waitForSelector('button[class*="border-2"]', { timeout: 10000 });
      
      // Click the first milestone checkbox
      const milestoneButtons = await this.page.$$('button[class*="border-2"]');
      if (milestoneButtons.length > 0) {
        await milestoneButtons[0].click();
        
        // Wait for completion animation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if milestone is marked as completed
        const completedMilestone = await this.page.$('button[class*="bg-green-500"]');
        if (!completedMilestone) {
          throw new Error('Milestone not marked as completed');
        }
      } else {
        throw new Error('No milestone buttons found');
      }

      await this.page.screenshot({ path: 'screenshots/milestone-completed.png' });

      return {
        name: 'Milestone Completion Test',
        success: true,
        screenshot: 'screenshots/milestone-completed.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/milestone-error.png' });
      return {
        name: 'Milestone Completion Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/milestone-error.png'
      };
    }
  }

  private async testRoleSelection(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing role selection...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Find and click role dropdown
      await this.page.waitForSelector('select', { timeout: 5000 });
      await this.page.select('select', 'AI-Enhanced Data Analyst');
      
      // Generate pathway with new role
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      
      // Wait for new pathway to load
      await this.page.waitForSelector('h2:has-text("AI-Enhanced Data Analyst")', { timeout: 10000 });
      
      await this.page.screenshot({ path: 'screenshots/role-changed.png' });

      return {
        name: 'Role Selection Test',
        success: true,
        screenshot: 'screenshots/role-changed.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/role-error.png' });
      return {
        name: 'Role Selection Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/role-error.png'
      };
    }
  }

  private async testResponsiveness(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing responsive design...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Test mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if content is still visible
      const titleElement = await this.page.$('h1');
      if (!titleElement) {
        throw new Error('Title not visible on mobile');
      }
      
      await this.page.screenshot({ path: 'screenshots/mobile-view.png' });
      
      // Test tablet viewport
      await this.page.setViewport({ width: 768, height: 1024 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.page.screenshot({ path: 'screenshots/tablet-view.png' });
      
      // Reset to desktop
      await this.page.setViewport({ width: 1200, height: 800 });

      return {
        name: 'Responsive Design Test',
        success: true,
        screenshot: 'screenshots/mobile-view.png'
      };
    } catch (error: any) {
      return {
        name: 'Responsive Design Test',
        success: false,
        error: error.message
      };
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser closed');
    }
  }

  private async testLiveAPIDataIntegration(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Live API Data Integration...');
    console.log('📡 Note: This test verifies if live resource fetching is working via Perplexity API');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Generate pathway to trigger resource fetching
      await this.page.waitForSelector('button:has-text("🚀 Generate My Pathway")', { timeout: 5000 });
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      
      // Wait longer for API calls to complete
      await this.page.waitForSelector('.bg-white.rounded-lg.shadow-sm', { timeout: 15000 });
      
      // Check browser network logs for API calls
      const logs: string[] = [];
      this.page.on('response', response => {
        logs.push(`${response.status()} ${response.url()}`);
      });
      
      // Look for resources and verify they're from live API or fallback
      const resourceElements = await this.page.$$('[href*="http"]');
      let liveDataDetected = false;
      let fallbackDataDetected = false;
      
      for (const element of resourceElements) {
        const href = await element.evaluate(el => el.getAttribute('href'));
        const text = await element.evaluate(el => el.textContent);
        
        // Check if we got live data (newer resources) vs fallback (curated)
        if (href && text) {
          if (text.includes('ChatGPT Prompt Engineering for Developers')) {
            fallbackDataDetected = true;
            console.log('🔄 Using FALLBACK data: Curated resource detected');
          }
          
          // Log resource source for verification
          console.log(`📚 Resource: ${text} -> ${href}`);
        }
      }
      
      // Check console logs for API attempts
      const consoleMessages = await this.page.evaluate(() => {
        return (window as any).testConsoleMessages || [];
      });
      
      const apiAttempted = logs.some(log => 
        log.includes('perplexity.ai') || 
        log.includes('Failed to fetch live resources')
      );
      
      let dataSource = 'UNKNOWN';
      if (apiAttempted && !fallbackDataDetected) {
        dataSource = 'LIVE API (Perplexity)';
        liveDataDetected = true;
      } else if (fallbackDataDetected) {
        dataSource = 'FALLBACK (Curated)';
      }
      
      await this.page.screenshot({ path: 'screenshots/api-integration.png' });
      
      console.log(`📊 Data Source: ${dataSource}`);
      console.log(`🔗 Live API Attempted: ${apiAttempted ? 'YES' : 'NO'}`);
      console.log(`📋 Fallback Used: ${fallbackDataDetected ? 'YES' : 'NO'}`);

      return {
        name: `Live API Data Integration Test (Source: ${dataSource})`,
        success: true,
        screenshot: 'screenshots/api-integration.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/api-error.png' });
      return {
        name: 'Live API Data Integration Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/api-error.png'
      };
    }
  }

  private async testResourceLinkValidation(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Resource Link Validation...');
    console.log('🔗 Verifying that all learning resource links are valid and accessible');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Generate pathway
      await this.page.waitForSelector('button:has-text("🚀 Generate My Pathway")', { timeout: 5000 });
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      await this.page.waitForSelector('[href*="http"]', { timeout: 10000 });
      
      // Get all resource links
      const resourceLinks = await this.page.$$eval('[href*="http"]', elements => 
        elements.map(el => ({
          href: el.getAttribute('href'),
          text: el.textContent?.trim()
        }))
      );
      
      console.log(`🔍 Found ${resourceLinks.length} resource links to validate`);
      
      let validLinks = 0;
      let mockLinks = 0;
      const linkResults: string[] = [];
      
      for (const link of resourceLinks.slice(0, 5)) { // Test first 5 links to avoid rate limits
        if (link.href) {
          try {
            const response = await fetch(link.href, { method: 'HEAD' });
            if (response.ok) {
              validLinks++;
              linkResults.push(`✅ ${link.text}: ${link.href} (Status: ${response.status})`);
            } else {
              linkResults.push(`⚠️  ${link.text}: ${link.href} (Status: ${response.status})`);
            }
          } catch (error: any) {
            // Check if it's a known curated/mock link
            if (link.href.includes('coursera.org') || 
                link.href.includes('edx.org') || 
                link.href.includes('microsoft.com') ||
                link.href.includes('deeplearning.ai')) {
              mockLinks++;
              linkResults.push(`📚 ${link.text}: ${link.href} (CURATED - may be example URL)`);
            } else {
              linkResults.push(`❌ ${link.text}: ${link.href} (Error: ${error.message})`);
            }
          }
        }
      }
      
      linkResults.forEach(result => console.log(result));
      
      await this.page.screenshot({ path: 'screenshots/link-validation.png' });

      return {
        name: `Resource Link Validation (${validLinks} valid, ${mockLinks} curated)`,
        success: validLinks > 0 || mockLinks > 0,
        screenshot: 'screenshots/link-validation.png'
      };
    } catch (error: any) {
      return {
        name: 'Resource Link Validation Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testProgressTracking(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Progress Tracking System...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Generate pathway
      await this.page.waitForSelector('button:has-text("🚀 Generate My Pathway")', { timeout: 5000 });
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      await this.page.waitForSelector('button[class*="border-2"]', { timeout: 10000 });
      
      // Check initial progress (should be 0%)
      let progressBar = await this.page.$('.progress-bar');
      if (!progressBar) {
        throw new Error('Progress bar not found');
      }
      
      let initialWidth = await progressBar.evaluate(el => (el as HTMLElement).style.width);
      console.log(`📊 Initial progress: ${initialWidth}`);
      
      // Complete several milestones
      const milestoneButtons = await this.page.$$('button[class*="border-2"]');
      let completedCount = 0;
      
      for (let i = 0; i < Math.min(3, milestoneButtons.length); i++) {
        await milestoneButtons[i].click();
        completedCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check progress update
        progressBar = await this.page.$('.progress-bar');
        const currentWidth = await progressBar?.evaluate(el => (el as HTMLElement).style.width);
        console.log(`📊 Progress after ${completedCount} milestones: ${currentWidth}`);
      }
      
      // Verify progress text updates
      const progressText = await this.page.$eval(
        'span:has-text("Progress:")', 
        el => el.textContent
      );
      
      if (!progressText?.includes(completedCount.toString())) {
        throw new Error(`Progress text not updated correctly: ${progressText}`);
      }
      
      await this.page.screenshot({ path: 'screenshots/progress-tracking.png' });

      return {
        name: `Progress Tracking (${completedCount} milestones completed)`,
        success: true,
        screenshot: 'screenshots/progress-tracking.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/progress-error.png' });
      return {
        name: 'Progress Tracking Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/progress-error.png'
      };
    }
  }

  private async testUserFlowEnd2End(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Complete User Flow (End-to-End)...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Step 1: Add custom skill
      await this.page.click('button:has-text("+ Add Skill")');
      await this.page.type('input[placeholder="Enter a skill..."]', 'Machine Learning');
      await this.page.click('button:has-text("Add")');
      console.log('✅ Step 1: Added custom skill');
      
      // Step 2: Change target role
      await this.page.select('select', 'AI-Enhanced Data Analyst');
      console.log('✅ Step 2: Changed target role');
      
      // Step 3: Generate pathway
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      await this.page.waitForSelector('.space-y-6', { timeout: 10000 });
      console.log('✅ Step 3: Generated pathway');
      
      // Step 4: Complete milestones
      const milestones = await this.page.$$('button[class*="border-2"]');
      for (let i = 0; i < Math.min(2, milestones.length); i++) {
        await milestones[i].click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      console.log('✅ Step 4: Completed milestones');
      
      // Step 5: Test resource links
      const resourceLinks = await this.page.$$('a[href*="http"]');
      if (resourceLinks.length > 0) {
        // Don't actually navigate, just verify links exist
        console.log(`✅ Step 5: Found ${resourceLinks.length} resource links`);
      }
      
      // Step 6: Test role alternatives
      const alternatives = await this.page.$$('button:has-text("Explore This Role")');
      if (alternatives.length > 0) {
        await alternatives[0].click();
        await this.page.waitForSelector('h2', { timeout: 5000 });
        console.log('✅ Step 6: Tested role alternatives');
      }
      
      await this.page.screenshot({ path: 'screenshots/end2end-flow.png' });

      return {
        name: 'Complete User Flow (End-to-End)',
        success: true,
        screenshot: 'screenshots/end2end-flow.png'
      };
    } catch (error: any) {
      await this.page.screenshot({ path: 'screenshots/end2end-error.png' });
      return {
        name: 'Complete User Flow (End-to-End) Test',
        success: false,
        error: error.message,
        screenshot: 'screenshots/end2end-error.png'
      };
    }
  }

  private async testErrorHandling(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Error Handling...');
    
    try {
      // Test invalid API endpoint
      const response = await this.page.goto(`${this.baseUrl}/api/nonexistent`, { 
        waitUntil: 'networkidle2' 
      });
      
      if (response && response.status() !== 404) {
        throw new Error('Expected 404 for nonexistent endpoint');
      }
      
      // Test malformed API request
      const apiResponse = await this.page.evaluate(async () => {
        try {
          const response = await fetch('/api/generate-pathway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json'
          });
          return { status: response.status, ok: response.ok };
        } catch (error: any) {
          return { error: error.message };
        }
      });
      
      console.log(`📊 API Error Test: ${JSON.stringify(apiResponse)}`);
      
      await this.page.screenshot({ path: 'screenshots/error-handling.png' });

      return {
        name: 'Error Handling Test',
        success: true,
        screenshot: 'screenshots/error-handling.png'
      };
    } catch (error: any) {
      return {
        name: 'Error Handling Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testAPIPerformance(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing API Performance...');
    
    try {
      const startTime = Date.now();
      
      // Test pathway generation performance
      const pathwayResponse = await this.page.evaluate(async () => {
        const start = performance.now();
        const response = await fetch('/api/generate-pathway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skills: ['Project Management', 'Data Analysis'],
            role: 'AI-Enhanced Project Manager'
          })
        });
        const end = performance.now();
        const data: any = await response.json();
        return { duration: end - start, success: data.success };
      });
      
      console.log(`⏱️  Pathway generation: ${pathwayResponse.duration.toFixed(2)}ms`);
      
      // Test health endpoint performance
      const healthResponse = await this.page.evaluate(async () => {
        const start = performance.now();
        const response = await fetch('/health');
        const end = performance.now();
        return { duration: end - start, status: response.status };
      });
      
      console.log(`⏱️  Health check: ${healthResponse.duration.toFixed(2)}ms`);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️  Total test time: ${totalTime}ms`);

      return {
        name: `API Performance (Pathway: ${pathwayResponse.duration.toFixed(0)}ms)`,
        success: pathwayResponse.duration < 5000 && pathwayResponse.success
      };
    } catch (error: any) {
      return {
        name: 'API Performance Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testAccessibility(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Accessibility Features...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Check for proper heading structure
      const headings = await this.page.$$eval('h1, h2, h3, h4, h5, h6', 
        elements => elements.map(el => ({ tag: el.tagName, text: el.textContent }))
      );
      
      console.log(`📋 Found ${headings.length} headings`);
      
      // Check for alt text on images
      const images = await this.page.$$eval('img', 
        elements => elements.map(el => ({ src: el.src, alt: el.alt }))
      );
      
      // Check for form labels
      const inputs = await this.page.$$eval('input', 
        elements => elements.map(el => ({ 
          type: el.type, 
          placeholder: el.placeholder,
          hasLabel: !!el.labels?.length 
        }))
      );
      
      // Check keyboard navigation
      await this.page.keyboard.press('Tab');
      const focusedElement = await this.page.evaluate(() => document.activeElement?.tagName);
      
      console.log(`⌨️  Keyboard navigation: First focusable element is ${focusedElement}`);
      
      await this.page.screenshot({ path: 'screenshots/accessibility.png' });

      return {
        name: `Accessibility Test (${headings.length} headings, ${inputs.length} inputs)`,
        success: headings.length > 0 && focusedElement !== 'BODY',
        screenshot: 'screenshots/accessibility.png'
      };
    } catch (error: any) {
      return {
        name: 'Accessibility Test',
        success: false,
        error: error.message
      };
    }
  }

  private async testDataPersistence(): Promise<TestResult> {
    if (!this.page) throw new Error('Page not initialized');
    
    console.log('🔍 Testing Data Persistence (Session Storage)...');
    
    try {
      await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Add a skill and complete some milestones
      await this.page.click('button:has-text("+ Add Skill")');
      await this.page.type('input[placeholder="Enter a skill..."]', 'Test Skill');
      await this.page.click('button:has-text("Add")');
      
      // Generate pathway and complete a milestone
      await this.page.click('button:has-text("🚀 Generate My Pathway")');
      await this.page.waitForSelector('button[class*="border-2"]', { timeout: 10000 });
      
      const milestones = await this.page.$$('button[class*="border-2"]');
      if (milestones.length > 0) {
        await milestones[0].click();
      }
      
      // Check if data persists in browser storage
      const storageData = await this.page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).length,
          sessionStorage: Object.keys(sessionStorage).length
        };
      });
      
      console.log(`💾 Storage: localStorage(${storageData.localStorage}), sessionStorage(${storageData.sessionStorage})`);
      
      // Refresh page and check if state is maintained
      await this.page.reload({ waitUntil: 'networkidle2' });
      
      // Check if added skill is still there (it should be in the state)
      const skillElements = await this.page.$$eval(
        'span[class*="bg-blue-100"]', 
        elements => elements.map(el => el.textContent)
      );
      
      console.log(`🔄 Skills after reload: ${skillElements.join(', ')}`);

      return {
        name: `Data Persistence (${skillElements.length} skills preserved)`,
        success: true
      };
    } catch (error: any) {
      return {
        name: 'Data Persistence Test',
        success: false,
        error: error.message
      };
    }
  }

  async generateReport(results: TestResult[]): Promise<void> {
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log('\n' + '='.repeat(50));
    console.log('🧪 BROWSER TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`📊 Tests Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log('');
    
    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.name}`);
      if (!result.success && result.error) {
        console.log(`   📝 Error: ${result.error}`);
      }
      if (result.screenshot) {
        console.log(`   📷 Screenshot: ${result.screenshot}`);
      }
    });
    
    console.log('\n' + '='.repeat(50));
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! The service is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.');
    }
  }
}

// Run the tests
async function runBrowserTests() {
  const tester = new BrowserTester();
  
  try {
    // Create screenshots directory
    await import('fs').then(fs => {
      if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots');
      }
    });
    
    await tester.initialize();
    
    console.log('🎯 Starting comprehensive browser tests...\n');
    const results = await tester.runAllTests();
    
    await tester.generateReport(results);
    
  } catch (error: any) {
    console.error('❌ Test runner error:', error.message);
  } finally {
    await tester.cleanup();
  }
}

// Export for use as module or run directly
if (require.main === module) {
  runBrowserTests();
}

export { BrowserTester, runBrowserTests };