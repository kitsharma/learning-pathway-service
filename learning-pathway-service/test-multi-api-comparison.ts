import fs from 'fs';

interface ApiTestResult {
  name: string;
  success: boolean;
  responseTime: number;
  rawResponse: string;
  formattedResults: any[];
  errorMessage?: string;
  providers: Set<string>;
  directLinks: number;
  totalResults: number;
}

async function testMultiApiComparison() {
  console.log('🔥 MULTI-API COMPARISON TEST\n');
  console.log('Testing: Grok (XAI), Perplexity, and Google Gemini');
  console.log('Search Query: "Machine Learning courses"\n');
  
  const testSkill = 'Machine Learning';
  const results: ApiTestResult[] = [];
  
  // Test 1: Grok API
  console.log('🤖 1. TESTING GROK API');
  console.log('================================================================================');
  const grokResult = await testGrokApi(testSkill);
  results.push(grokResult);
  displayResults(grokResult);
  
  console.log('\n');
  
  // Test 2: Perplexity API  
  console.log('🔍 2. TESTING PERPLEXITY API');
  console.log('================================================================================');
  const perplexityResult = await testPerplexityApi(testSkill);
  results.push(perplexityResult);
  displayResults(perplexityResult);
  
  console.log('\n');
  
  // Test 3: Google Gemini API
  console.log('🧠 3. TESTING GOOGLE GEMINI API');
  console.log('================================================================================');
  const geminiResult = await testGeminiApi(testSkill);
  results.push(geminiResult);
  displayResults(geminiResult);
  
  // Generate comparison summary
  console.log('\n');
  console.log('📊 COMPREHENSIVE COMPARISON');
  console.log('================================================================================');
  
  const workingApis = results.filter(r => r.success);
  const failedApis = results.filter(r => !r.success);
  
  console.log(`✅ Working APIs: ${workingApis.length}/3`);
  console.log(`❌ Failed APIs: ${failedApis.length}/3`);
  
  if (workingApis.length > 0) {
    console.log('\n🏆 PERFORMANCE COMPARISON:');
    workingApis.forEach(api => {
      console.log(`   ${api.name}:`);
      console.log(`     Response Time: ${api.responseTime}ms`);
      console.log(`     Total Results: ${api.totalResults}`);
      console.log(`     Direct Links: ${api.directLinks}`);
      console.log(`     Providers: ${Array.from(api.providers).join(', ')}`);
    });
    
    console.log('\n🎯 PROVIDER DIVERSITY:');
    const allProviders = new Set<string>();
    workingApis.forEach(api => {
      api.providers.forEach(p => allProviders.add(p));
    });
    console.log(`   Combined Providers: ${Array.from(allProviders).join(', ')}`);
    
    console.log('\n⚡ BEST PERFORMING API:');
    const bestApi = workingApis.reduce((best, current) => {
      const bestScore = (best.totalResults * 2) + best.directLinks - (best.responseTime / 1000);
      const currentScore = (current.totalResults * 2) + current.directLinks - (current.responseTime / 1000);
      return currentScore > bestScore ? current : best;
    });
    console.log(`   Winner: ${bestApi.name}`);
    console.log(`   Reasons: ${bestApi.totalResults} results, ${bestApi.directLinks} direct links, ${bestApi.responseTime}ms response`);
  }
  
  if (failedApis.length > 0) {
    console.log('\n❌ FAILED API DETAILS:');
    failedApis.forEach(api => {
      console.log(`   ${api.name}: ${api.errorMessage}`);
    });
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (workingApis.length > 1) {
    console.log('   • Use multi-API strategy for maximum coverage');
    console.log('   • Implement failover between working APIs');
    console.log('   • Combine results to maximize provider diversity');
  } else if (workingApis.length === 1) {
    console.log(`   • Use ${workingApis[0].name} as primary API`);
    console.log('   • Consider implementing backup strategies');
  } else {
    console.log('   • All APIs failed - check API keys and connectivity');
  }
  
  // Save detailed results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    testSkill,
    results: results.map(r => ({
      ...r,
      providers: Array.from(r.providers),
      rawResponse: r.rawResponse.substring(0, 500) + '...' // Truncate for readability
    }))
  };
  
  fs.writeFileSync('api-comparison-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Detailed report saved to: api-comparison-report.json');
}

async function testGrokApi(skill: string): Promise<ApiTestResult> {
  const startTime = Date.now();
  const xaiApiKey = process.env.XAI_API_KEY || '';
  const xaiApiBase = process.env.X_AI_API_BASE || 'https://api.x.ai/v1';
  
  const prompt = `Find 8 diverse online courses for "${skill}" from different providers including:
- Coursera, edX, Udemy (popular platforms)
- University courses (.edu domains)
- Specialized providers (LinkedIn Learning, Pluralsight, etc.)

Return JSON format:
[{"title":"Course Name","url":"https://exact-url","provider":"Provider Name","cost":"free/paid","description":"Brief description"}]`;

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
          { role: 'system', content: 'You are a course discovery expert. Always return valid JSON arrays with real, working course URLs.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || '';
    const formattedResults = parseApiResponse(rawResponse);
    
    return {
      name: 'Grok (XAI)',
      success: true,
      responseTime,
      rawResponse,
      formattedResults,
      providers: extractProviders(formattedResults),
      directLinks: countDirectLinks(formattedResults),
      totalResults: formattedResults.length
    };
    
  } catch (error: any) {
    return {
      name: 'Grok (XAI)',
      success: false,
      responseTime: Date.now() - startTime,
      rawResponse: '',
      formattedResults: [],
      errorMessage: error.message,
      providers: new Set(),
      directLinks: 0,
      totalResults: 0
    };
  }
}

async function testPerplexityApi(skill: string): Promise<ApiTestResult> {
  const startTime = Date.now();
  const apiKey = process.env.PERPLEXITY_API_KEY || '';
  
  const prompt = `Find 8 diverse online courses for "${skill}" from different providers including universities, Coursera, edX, Udemy, and specialized platforms. Include exact URLs, provider names, and cost information. Return as JSON array.`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: 'You are a course discovery expert with web access. Find real, current courses with working URLs.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResponse = data.choices[0]?.message?.content || '';
    const formattedResults = parseApiResponse(rawResponse);
    
    return {
      name: 'Perplexity',
      success: true,
      responseTime,
      rawResponse,
      formattedResults,
      providers: extractProviders(formattedResults),
      directLinks: countDirectLinks(formattedResults),
      totalResults: formattedResults.length
    };
    
  } catch (error: any) {
    return {
      name: 'Perplexity',
      success: false,
      responseTime: Date.now() - startTime,
      rawResponse: '',
      formattedResults: [],
      errorMessage: error.message,
      providers: new Set(),
      directLinks: 0,
      totalResults: 0
    };
  }
}

async function testGeminiApi(skill: string): Promise<ApiTestResult> {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_AI_KEY || '';
  
  const prompt = `Find 8 diverse online courses for "${skill}" from different providers including universities, Coursera, edX, Udemy, and specialized platforms. Include exact URLs, provider names, and cost information. Return as JSON array with format: [{"title":"Course Name","url":"https://exact-url","provider":"Provider Name","cost":"free/paid","description":"Brief description"}]`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000
        }
      })
    });

    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawResponse = data.candidates[0]?.content?.parts[0]?.text || '';
    const formattedResults = parseApiResponse(rawResponse);
    
    return {
      name: 'Google Gemini',
      success: true,
      responseTime,
      rawResponse,
      formattedResults,
      providers: extractProviders(formattedResults),
      directLinks: countDirectLinks(formattedResults),
      totalResults: formattedResults.length
    };
    
  } catch (error: any) {
    return {
      name: 'Google Gemini',
      success: false,
      responseTime: Date.now() - startTime,
      rawResponse: '',
      formattedResults: [],
      errorMessage: error.message,
      providers: new Set(),
      directLinks: 0,
      totalResults: 0
    };
  }
}

function parseApiResponse(content: string): any[] {
  try {
    // Try to extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: parse structured text
    const results: any[] = [];
    const lines = content.split('\n');
    let currentResult: any = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('title:') || trimmed.includes('Title:')) {
        if (currentResult.title) {
          results.push({...currentResult});
          currentResult = {};
        }
        currentResult.title = trimmed.split(':')[1]?.trim() || '';
      } else if (trimmed.includes('url:') || trimmed.includes('URL:')) {
        const urlMatch = trimmed.match(/https?:\/\/[^\s\)]+/);
        if (urlMatch) currentResult.url = urlMatch[0];
      } else if (trimmed.includes('provider:') || trimmed.includes('Provider:')) {
        currentResult.provider = trimmed.split(':')[1]?.trim() || '';
      }
    }
    
    if (currentResult.title) {
      results.push(currentResult);
    }
    
    return results;
    
  } catch (error) {
    console.warn('Failed to parse API response:', error);
    return [];
  }
}

function extractProviders(results: any[]): Set<string> {
  const providers = new Set<string>();
  results.forEach(result => {
    if (result.provider) {
      providers.add(result.provider);
    } else if (result.url) {
      // Extract provider from URL
      const domain = new URL(result.url).hostname.toLowerCase();
      if (domain.includes('coursera')) providers.add('Coursera');
      else if (domain.includes('edx')) providers.add('edX');
      else if (domain.includes('udemy')) providers.add('Udemy');
      else if (domain.includes('edu')) providers.add('University');
      else if (domain.includes('linkedin')) providers.add('LinkedIn Learning');
      else providers.add('Other');
    }
  });
  return providers;
}

function countDirectLinks(results: any[]): number {
  return results.filter(result => 
    result.url && 
    !result.url.includes('/search') && 
    !result.url.includes('/browse')
  ).length;
}

function displayResults(result: ApiTestResult) {
  if (result.success) {
    console.log(`✅ SUCCESS (${result.responseTime}ms)`);
    console.log(`📊 Results: ${result.totalResults} courses found`);
    console.log(`🔗 Direct Links: ${result.directLinks}/${result.totalResults}`);
    console.log(`🏢 Providers: ${Array.from(result.providers).join(', ')}`);
    
    console.log('\n📝 RAW RESPONSE (first 300 chars):');
    console.log(`"${result.rawResponse.substring(0, 300)}..."`);
    
    if (result.formattedResults.length > 0) {
      console.log('\n🎯 FORMATTED RESULTS:');
      result.formattedResults.slice(0, 3).forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.title || 'Untitled'}`);
        console.log(`      Provider: ${course.provider || 'Unknown'}`);
        console.log(`      URL: ${course.url || 'No URL'}`);
        console.log(`      Cost: ${course.cost || 'Unknown'}`);
      });
      
      if (result.formattedResults.length > 3) {
        console.log(`   ... and ${result.formattedResults.length - 3} more courses`);
      }
    }
  } else {
    console.log(`❌ FAILED (${result.responseTime}ms)`);
    console.log(`💥 Error: ${result.errorMessage}`);
  }
}

testMultiApiComparison().catch(console.error);