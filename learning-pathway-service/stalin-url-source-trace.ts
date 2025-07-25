import { EnhancedResourceFetcher } from './src/services/enhanced-resource-fetcher';

async function stalinUrlSourceTrace() {
  console.log('🔴 STALIN\'S URL SOURCE INVESTIGATION');
  console.log('Tracing where the bad URLs come from...\n');
  
  const fetcher = new EnhancedResourceFetcher();
  
  // Test with a skill that might generate the problematic URLs
  const testSkill = 'AI-Driven Process Improvement';
  
  console.log(`Testing skill: "${testSkill}"`);
  console.log('='.repeat(50));
  
  try {
    const resources = await fetcher.findVerifiedResources(testSkill);
    
    console.log(`\n📊 FOUND ${resources.length} RESOURCES:`);
    
    resources.forEach((resource, index) => {
      console.log(`\n${index + 1}. "${resource.title}"`);
      console.log(`   Provider: ${resource.provider}`);
      console.log(`   URL: ${resource.url}`);
      console.log(`   Verified: ${resource.verified}`);
      
      // Check if this URL matches our suspicious ones
      const suspiciousUrls = [
        'futurelearn.com/courses/ai-driven-process-improvement',
        'edx.org/course/predictive-analytics-for-business',
        'edx.org/course/automated-testing-with-artificial-intelligence'
      ];
      
      const isSuspicious = suspiciousUrls.some(suspect => resource.url.includes(suspect));
      if (isSuspicious) {
        console.log(`   🚨 SUSPICIOUS URL DETECTED!`);
      }
    });
    
    // Now test each URL for 404s
    console.log('\n🔴 STALIN\'S URL VALIDATION:');
    console.log('='.repeat(50));
    
    let deadUrlCount = 0;
    
    for (const resource of resources) {
      try {
        console.log(`\nTesting: ${resource.url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(resource.url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const status = response.status;
        console.log(`   Status: ${status} ${status < 400 ? '✅' : '❌'}`);
        
        if (status >= 400) {
          deadUrlCount++;
          console.log(`   💀 DEAD URL DETECTED!`);
        }
        
      } catch (error: any) {
        deadUrlCount++;
        console.log(`   ❌ ERROR: ${error.message}`);
        console.log(`   💀 DEAD URL DETECTED!`);
      }
    }
    
    console.log('\n🔴 STALIN\'S FINAL ANALYSIS:');
    console.log(`   Total URLs: ${resources.length}`);
    console.log(`   Dead URLs: ${deadUrlCount}`);
    console.log(`   Success Rate: ${((resources.length - deadUrlCount) / resources.length * 100).toFixed(1)}%`);
    
    if (deadUrlCount > 0) {
      console.log('\n🚨 CRITICAL ISSUE: Dead URLs are being served to users!');
      console.log('   SOLUTION REQUIRED: Implement soft 404 detection and URL validation!');
    }
    
  } catch (error) {
    console.log(`❌ Investigation failed: ${error}`);
  }
}

stalinUrlSourceTrace().catch(console.error);