// Test the enhanced search URL generation directly
import { EnhancedResourceFetcher } from './src/services/enhanced-resource-fetcher';

async function testSearchUrls() {
  console.log('🔍 Testing Enhanced Search URL Generation');
  console.log('='.repeat(50));
  
  const fetcher = new EnhancedResourceFetcher();
  
  // Test different skills to see the custom URLs generated
  const testSkills = [
    'AI-Assisted Scheduling',
    'Customer Analytics', 
    'Data Visualization',
    'Process Automation',
    'Machine Learning',
    'Business Management'
  ];
  
  for (const skill of testSkills) {
    console.log(`\n📊 Testing: "${skill}"`);
    console.log('-'.repeat(40));
    
    try {
      const resources = await fetcher.findVerifiedResources(skill);
      
      // Filter for Microsoft Learn, Coursera, and edX
      const msLearn = resources.filter(r => r.provider.includes('Microsoft'));
      const coursera = resources.filter(r => r.provider.includes('Coursera'));
      const edx = resources.filter(r => r.provider.includes('edX'));
      
      if (msLearn.length > 0) {
        console.log('🏢 Microsoft Learn:');
        msLearn.forEach(r => {
          console.log(`   "${r.title}"`);
          console.log(`   URL: ${r.url}`);
          if (r.url.includes('terms=')) {
            const terms = r.url.split('terms=')[1].split('&')[0];
            const decoded = decodeURIComponent(terms).replace(/%20/g, ' ');
            console.log(`   Search Terms: "${decoded}"`);
          }
        });
      }
      
      if (coursera.length > 0) {
        console.log('🎓 Coursera:');
        coursera.forEach(r => {
          console.log(`   "${r.title}"`);
          console.log(`   URL: ${r.url}`);
          if (r.url.includes('query=')) {
            const query = r.url.split('query=')[1].split('&')[0];
            const decoded = decodeURIComponent(query).replace(/\+/g, ' ');
            console.log(`   Search Query: "${decoded}"`);
          }
        });
      }
      
      if (edx.length > 0) {
        console.log('🏛️ edX:');
        edx.forEach(r => {
          console.log(`   "${r.title}"`);
          console.log(`   URL: ${r.url}`);
          if (r.url.includes('?q=')) {
            const query = r.url.split('?q=')[1].split('&')[0];
            const decoded = decodeURIComponent(query).replace(/\+/g, ' ');
            console.log(`   Search Query: "${decoded}"`);
          }
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }
  
  console.log('\n✅ URL Generation Test Complete!');
}

testSearchUrls().catch(console.error);