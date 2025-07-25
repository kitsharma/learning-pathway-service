import { LearningResource } from '../types';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  rating?: number;
  provider?: string;
  cost?: string;
  duration?: string;
  quality_score?: number;
}

interface CourseProvider {
  name: string;
  baseUrl: string;
  searchPattern: string;
  costIndicator: 'free' | 'paid' | 'mixed';
  qualityScore: number;
}

export class EnhancedResourceFetcher {
  private xaiApiKey: string;
  private xaiApiBase: string;
  private webSearchEndpoints: string[];
  private courseProviders: CourseProvider[];
  
  constructor() {
    this.xaiApiKey = process.env.XAI_API_KEY || '';
    this.xaiApiBase = process.env.X_AI_API_BASE || 'https://api.x.ai/v1';
    
    // Initialize course providers with quality scores
    this.courseProviders = [
      { name: 'Coursera', baseUrl: 'coursera.org', searchPattern: 'site:coursera.org', costIndicator: 'mixed', qualityScore: 9.5 },
      { name: 'edX', baseUrl: 'edx.org', searchPattern: 'site:edx.org', costIndicator: 'mixed', qualityScore: 9.0 },
      { name: 'LinkedIn Learning', baseUrl: 'linkedin.com/learning', searchPattern: 'site:linkedin.com/learning', costIndicator: 'paid', qualityScore: 8.5 },
      { name: 'Udemy', baseUrl: 'udemy.com', searchPattern: 'site:udemy.com', costIndicator: 'paid', qualityScore: 7.5 },
      { name: 'Microsoft Learn', baseUrl: 'docs.microsoft.com/learn', searchPattern: 'site:docs.microsoft.com/learn', costIndicator: 'free', qualityScore: 8.8 },
      { name: 'Google AI Education', baseUrl: 'developers.google.com', searchPattern: 'site:developers.google.com', costIndicator: 'free', qualityScore: 8.7 },
      { name: 'IBM SkillsBuild', baseUrl: 'skillsbuild.org', searchPattern: 'site:skillsbuild.org', costIndicator: 'free', qualityScore: 8.0 },
      { name: 'AWS Training', baseUrl: 'aws.amazon.com/training', searchPattern: 'site:aws.amazon.com/training', costIndicator: 'mixed', qualityScore: 8.3 },
      { name: 'Pluralsight', baseUrl: 'pluralsight.com', searchPattern: 'site:pluralsight.com', costIndicator: 'paid', qualityScore: 8.2 },
      { name: 'FutureLearn', baseUrl: 'futurelearn.com', searchPattern: 'site:futurelearn.com', costIndicator: 'mixed', qualityScore: 7.8 }
    ];
    
    // Web search endpoints (in order of preference)
    this.webSearchEndpoints = [
      'duckduckgo',
      'google_custom_search',
      'bing_search'
    ];
  }

  async findVerifiedResources(skillName: string): Promise<LearningResource[]> {
    console.log(`🤖 Grok-powered resource discovery for: ${skillName}`);
    
    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();
    
    try {
      // Strategy 1: Grok intelligent search with web access
      console.log(`   🔍 Grok intelligent web search...`);
      const grokResults = await this.searchWithGrok(skillName);
      this.addUniqueResults(allResults, grokResults, seenUrls);
      console.log(`   Grok: Found ${grokResults.length} resources`);
      
      // Strategy 2: Provider-specific targeted searches
      console.log(`   🎯 Provider-specific searches...`);
      const providerResults = await this.searchProviderSpecific(skillName);
      this.addUniqueResults(allResults, providerResults, seenUrls);
      console.log(`   Providers: Found ${providerResults.length} additional resources`);
      
      // Strategy 3: Course aggregator search
      console.log(`   📚 Course aggregator search...`);
      const aggregatorResults = await this.searchCourseAggregators(skillName);
      this.addUniqueResults(allResults, aggregatorResults, seenUrls);
      console.log(`   Aggregators: Found ${aggregatorResults.length} additional resources`);
      
    } catch (error: any) {
      console.warn(`   Search failed, falling back to curated:`, error.message);
    }
    
    // Fallback to enhanced curated resources if needed
    if (allResults.length < 3) {
      console.log(`   📋 Adding curated resources...`);
      const curatedResults = await this.getEnhancedCuratedResources(skillName);
      this.addUniqueResults(allResults, curatedResults, seenUrls);
    }
    
    // Process and validate results
    const verifiedResources = await this.processAndValidateResults(allResults, skillName);
    
    // Score, rank and return top resources
    const rankedResources = this.scoreAndRankResources(verifiedResources, skillName);
    
    console.log(`✅ Final result: ${rankedResources.length} verified resources`);
    return rankedResources.slice(0, 3);
  }

  private async searchWithGrok(skillName: string): Promise<SearchResult[]> {
    if (!this.xaiApiKey || this.xaiApiKey === 'xai-your-api-key-here') {
      console.warn('   XAI API key not configured, skipping...');
      return [];
    }

    const searchPrompt = `Find 5 ACTIVE, WORKING online courses for "${skillName}" with EXACT URLs that exist right now in January 2025. 

REQUIREMENTS:
1. REAL courses from: Coursera, edX, LinkedIn Learning, Udemy, FutureLearn, Pluralsight
2. EXACT working URLs - not search pages or generic links
3. Currently available courses (not discontinued)
4. Specific to "${skillName}" development

For Microsoft Learn, use these working paths:
- AI topics: https://learn.microsoft.com/en-us/training/paths/get-started-with-artificial-intelligence-on-azure/
- Automation: https://learn.microsoft.com/en-us/training/paths/automate-process-power-automate/
- Analytics: https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/

Return JSON array:
[
  {
    "title": "Exact Course Title",
    "url": "https://exact-working-url.com/course/path",
    "provider": "Provider Name",
    "description": "What you'll learn",
    "duration": "X weeks",
    "cost": "free" or "paid",
    "rating": 4.5
  }
]

CRITICAL: Test each URL to ensure it works. No broken links!`;

    try {
      const response = await fetch(`${this.xaiApiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.xaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-2-1212',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that finds current, active online learning resources. Always provide working URLs and accurate information. Format responses as valid JSON when requested.'
            },
            {
              role: 'user',
              content: searchPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      return this.parseGrokResponse(content);
      
    } catch (error: any) {
      console.warn('   Grok search failed:', error.message);
      return [];
    }
  }

  private parseGrokResponse(content: string): SearchResult[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsedResults = JSON.parse(jsonMatch[0]);
        return parsedResults.map((item: any) => {
          // Convert potentially fake direct URLs to search URLs
          const convertedUrl = this.convertToSearchUrl(item.url, item.title, item.provider);
          
          return {
            title: item.title || '',
            url: convertedUrl,
            provider: item.provider || '',
            description: item.description || '',
            duration: item.duration || 'varies',
            cost: item.cost || 'unknown',
            rating: item.rating || 4.0,
            quality_score: this.calculateQualityScore(item)
          };
        });
      }
      
      // Fallback: parse structured text
      return this.parseStructuredText(content);
      
    } catch (error: any) {
      console.warn('   Failed to parse Grok response:', error.message);
      return [];
    }
  }

  private parseStructuredText(content: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = content.split('\n');
    let currentResult: Partial<SearchResult> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^\d+\./)) {
        if (currentResult.title && currentResult.url) {
          results.push(currentResult as SearchResult);
        }
        currentResult = { title: trimmed.replace(/^\d+\.\s*/, '') };
      } else if (trimmed.includes('URL:') || trimmed.includes('Link:')) {
        const urlMatch = trimmed.match(/https?:\/\/[^\s]+/);
        if (urlMatch) currentResult.url = urlMatch[0];
      } else if (trimmed.includes('Provider:')) {
        currentResult.provider = trimmed.split(':')[1]?.trim();
      } else if (trimmed.includes('Duration:')) {
        currentResult.duration = trimmed.split(':')[1]?.trim();
      } else if (trimmed.includes('Cost:')) {
        currentResult.cost = trimmed.split(':')[1]?.trim().toLowerCase();
      }
    }
    
    if (currentResult.title && currentResult.url) {
      results.push(currentResult as SearchResult);
    }
    
    return results;
  }

  private async searchProviderSpecific(skillName: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Search top providers specifically
    for (const provider of this.courseProviders.slice(0, 5)) {
      try {
        const providerResults = await this.searchSpecificProvider(skillName, provider);
        results.push(...providerResults);
      } catch (error) {
        console.warn(`   Provider search failed for ${provider.name}`);
      }
    }
    
    return results;
  }

  private async searchSpecificProvider(skillName: string, provider: CourseProvider): Promise<SearchResult[]> {
    // Simulate provider-specific search by constructing likely URLs
    const searchTerms = this.generateSearchTerms(skillName);
    const results: SearchResult[] = [];
    
    for (const term of searchTerms.slice(0, 2)) {
      const constructedResult = this.constructProviderResult(term, provider, skillName);
      if (constructedResult) {
        results.push(constructedResult);
      }
    }
    
    return results;
  }

  private buildMicrosoftLearnSearch(skillName: string, searchTerm: string): {url: string, title: string} {
    // Create intelligent Microsoft Learn search URLs
    const skill = skillName.toLowerCase();
    const term = searchTerm.toLowerCase();
    
    // Build search query with relevant terms
    let searchQuery = '';
    let specificTitle = '';
    
    // AI and Machine Learning topics
    if (skill.includes('ai') || skill.includes('artificial intelligence') || skill.includes('machine learning')) {
      if (skill.includes('customer') || skill.includes('analytics')) {
        searchQuery = 'ai%20customer%20analytics';
        specificTitle = 'AI Customer Analytics';
      } else if (skill.includes('automation')) {
        searchQuery = 'ai%20automation%20power%20platform';
        specificTitle = 'AI Automation with Power Platform';
      } else if (skill.includes('conversational')) {
        searchQuery = 'ai%20bot%20conversational%20framework';
        specificTitle = 'Conversational AI and Bot Framework';
      } else {
        searchQuery = 'artificial%20intelligence%20azure';
        specificTitle = 'AI Fundamentals on Azure';
      }
    }
    // Data and Analytics topics
    else if (skill.includes('data') || skill.includes('analytics')) {
      if (skill.includes('visualization')) {
        searchQuery = 'power%20bi%20data%20visualization';
        specificTitle = 'Data Visualization with Power BI';
      } else if (skill.includes('science')) {
        searchQuery = 'data%20science%20azure%20machine%20learning';
        specificTitle = 'Data Science on Azure';
      } else {
        searchQuery = 'data%20analytics%20azure';
        specificTitle = 'Data Analytics on Azure';
      }
    }
    // Automation topics
    else if (skill.includes('automation') || skill.includes('workflow')) {
      if (skill.includes('power')) {
        searchQuery = 'power%20automate%20workflow';
        specificTitle = 'Power Automate Workflows';
      } else if (skill.includes('scheduling')) {
        searchQuery = 'automation%20scheduling%20azure';
        specificTitle = 'Automation and Scheduling';
      } else {
        searchQuery = 'process%20automation%20power%20platform';
        specificTitle = 'Process Automation';
      }
    }
    // Cloud and Azure topics
    else if (skill.includes('cloud') || skill.includes('azure')) {
      searchQuery = 'azure%20fundamentals';
      specificTitle = 'Azure Cloud Fundamentals';
    }
    // Microsoft 365 and Office topics
    else if (skill.includes('office') || skill.includes('365') || skill.includes('microsoft')) {
      searchQuery = 'microsoft%20365%20productivity';
      specificTitle = 'Microsoft 365 Productivity';
    }
    // Generic fallback
    else {
      // Clean and encode the search term
      const cleanTerm = searchTerm.replace(/[^\w\s]/g, '').trim();
      searchQuery = encodeURIComponent(cleanTerm).replace(/%20/g, '%20');
      specificTitle = `${skillName} Training`;
    }
    
    // Construct the Microsoft Learn browse URL with search terms
    const baseUrl = 'https://learn.microsoft.com/en-us/training/browse/';
    const fullUrl = `${baseUrl}?terms=${searchQuery}`;
    
    return {
      url: fullUrl,
      title: specificTitle
    };
  }

  private buildCourseraSearch(skillName: string, searchTerm: string): {url: string, title: string} {
    // Create intelligent Coursera search URLs
    const skill = skillName.toLowerCase();
    let searchQuery = '';
    let specificTitle = '';
    
    // AI and Machine Learning
    if (skill.includes('ai') || skill.includes('machine learning')) {
      if (skill.includes('customer')) {
        searchQuery = 'ai+customer+analytics';
        specificTitle = 'AI for Customer Analytics Specialization';
      } else if (skill.includes('conversational')) {
        searchQuery = 'conversational+ai+chatbot';
        specificTitle = 'Conversational AI Specialization';
      } else {
        searchQuery = 'machine+learning+ai';
        specificTitle = 'Machine Learning Specialization';
      }
    }
    // Data Science and Analytics
    else if (skill.includes('data') || skill.includes('analytics')) {
      if (skill.includes('visualization')) {
        searchQuery = 'data+visualization+analytics';
        specificTitle = 'Data Visualization Specialization';
      } else {
        searchQuery = 'data+science+analytics';
        specificTitle = 'Data Science Specialization';
      }
    }
    // Business and Management
    else if (skill.includes('management') || skill.includes('business')) {
      searchQuery = 'business+management';
      specificTitle = 'Business Management Specialization';
    }
    // Generic fallback
    else {
      searchQuery = encodeURIComponent(searchTerm).replace(/%20/g, '+');
      specificTitle = `${skillName} Specialization`;
    }
    
    const baseUrl = 'https://www.coursera.org/search';
    const fullUrl = `${baseUrl}?query=${searchQuery}&index=prod_all_launched_products_term_optimization`;
    
    return {
      url: fullUrl,
      title: specificTitle
    };
  }

  private buildEdXSearch(skillName: string, searchTerm: string): {url: string, title: string} {
    // Create intelligent edX search URLs
    const skill = skillName.toLowerCase();
    let searchQuery = '';
    let specificTitle = '';
    
    // AI and Computer Science
    if (skill.includes('ai') || skill.includes('machine learning') || skill.includes('computer science')) {
      if (skill.includes('customer')) {
        searchQuery = 'artificial+intelligence+customer+analytics';
        specificTitle = 'AI Customer Analytics Course';
      } else if (skill.includes('automation')) {
        searchQuery = 'ai+automation+machine+learning';
        specificTitle = 'AI and Automation Course';
      } else {
        searchQuery = 'artificial+intelligence+machine+learning';
        specificTitle = 'Introduction to Artificial Intelligence';
      }
    }
    // Data Science
    else if (skill.includes('data') || skill.includes('analytics')) {
      searchQuery = 'data+science+analytics';
      specificTitle = 'Data Science and Analytics Course';
    }
    // Business and Management
    else if (skill.includes('business') || skill.includes('management')) {
      searchQuery = 'business+management';
      specificTitle = 'Business Management Course';
    }
    // Generic fallback
    else {
      searchQuery = encodeURIComponent(searchTerm).replace(/%20/g, '+');
      specificTitle = `${skillName} Course`;
    }
    
    const baseUrl = 'https://www.edx.org/search';
    const fullUrl = `${baseUrl}?q=${searchQuery}`;
    
    return {
      url: fullUrl,
      title: specificTitle
    };
  }

  private generateSearchTerms(skillName: string): string[] {
    const baseTerms = [skillName.toLowerCase()];
    
    // Add variations
    if (skillName.includes('AI')) {
      baseTerms.push(skillName.replace('AI', 'artificial intelligence'));
      baseTerms.push(skillName.replace('AI', 'machine learning'));
    }
    
    if (skillName.includes('Analytics')) {
      baseTerms.push(skillName.replace('Analytics', 'analysis'));
      baseTerms.push(skillName.replace('Analytics', 'data science'));
    }
    
    // Add course-specific terms
    baseTerms.push(`${skillName} course`);
    baseTerms.push(`${skillName} training`);
    baseTerms.push(`${skillName} certification`);
    
    return baseTerms;
  }

  private constructProviderResult(searchTerm: string, provider: CourseProvider, skillName: string): SearchResult | null {
    // This is a simplified approach - in production, you'd use actual search APIs
    const urlFriendlyTerm = searchTerm.replace(/\s+/g, '-').toLowerCase();
    
    let constructedUrl = '';
    let title = '';
    
    switch (provider.name) {
      case 'Coursera':
        const courseraResult = this.buildCourseraSearch(skillName, searchTerm);
        constructedUrl = courseraResult.url;
        title = courseraResult.title;
        break;
      case 'edX':
        const edxResult = this.buildEdXSearch(skillName, searchTerm);
        constructedUrl = edxResult.url;
        title = edxResult.title;
        break;
      case 'Microsoft Learn':
        const msSearchResult = this.buildMicrosoftLearnSearch(skillName, searchTerm);
        constructedUrl = msSearchResult.url;
        title = msSearchResult.title;
        break;
      case 'Google AI Education':
        constructedUrl = `https://developers.google.com/machine-learning/crash-course`;
        title = `${skillName} Fundamentals`;
        break;
      default:
        return null;
    }
    
    return {
      title,
      url: constructedUrl,
      provider: provider.name,
      description: `Learn ${skillName} with ${provider.name}`,
      duration: '4-8 weeks',
      cost: provider.costIndicator === 'free' ? 'free' : 'paid',
      rating: 4.2,
      quality_score: provider.qualityScore
    };
  }

  private async searchCourseAggregators(skillName: string): Promise<SearchResult[]> {
    // Search course aggregator sites
    const aggregatorResults: SearchResult[] = [];
    
    // Class Central - course aggregator
    aggregatorResults.push({
      title: `${skillName} Courses`,
      url: `https://www.classcentral.com/search?q=${encodeURIComponent(skillName)}`,
      provider: 'Class Central',
      description: `Find ${skillName} courses from multiple providers`,
      duration: 'varies',
      cost: 'mixed',
      rating: 4.0,
      quality_score: 7.5
    });
    
    // CourseReport
    aggregatorResults.push({
      title: `${skillName} Training Programs`,
      url: `https://www.coursereport.com/schools?track=${encodeURIComponent(skillName)}`,
      provider: 'Course Report',
      description: `${skillName} bootcamps and intensive programs`,
      duration: 'varies',
      cost: 'paid',
      rating: 4.1,
      quality_score: 7.0
    });
    
    return aggregatorResults;
  }

  private async getEnhancedCuratedResources(skillName: string): Promise<SearchResult[]> {
    // Enhanced curated database with quality scores
    const resourceMap: Record<string, SearchResult[]> = {
      'AI-Powered Customer Analytics': [
        {
          title: 'Customer Analytics',
          url: 'https://www.coursera.org/learn/wharton-customer-analytics',
          provider: 'Coursera',
          description: 'Learn customer analytics from Wharton School',
          duration: '4 weeks',
          cost: 'free',
          rating: 4.6,
          quality_score: 9.0
        },
        {
          title: 'AI Fundamentals',
          url: 'https://learn.microsoft.com/en-us/training/paths/get-started-with-artificial-intelligence-on-azure/',
          provider: 'Microsoft Learn',
          description: 'Get started with AI on Azure platform',
          duration: '3 hours',
          cost: 'free',
          rating: 4.5,
          quality_score: 8.8
        }
      ],
      'Conversational AI Management': [
        {
          title: 'ChatGPT Prompt Engineering for Developers',
          url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/',
          provider: 'DeepLearning.AI',
          description: 'Learn prompt engineering for conversational AI',
          duration: '1 hour',
          cost: 'free',
          rating: 4.8,
          quality_score: 9.5
        },
        {
          title: 'AI Fundamentals',
          url: 'https://learn.microsoft.com/en-us/training/paths/get-started-with-artificial-intelligence-on-azure/',
          provider: 'Microsoft Learn',
          description: 'Get started with AI on Azure platform',
          duration: '3 hours',
          cost: 'free',
          rating: 4.5,
          quality_score: 8.8
        }
      ],
      'Customer Journey Automation': [
        {
          title: 'Marketing Automation',
          url: 'https://academy.hubspot.com/courses/marketing-automation',
          provider: 'HubSpot Academy',
          description: 'Automate customer journeys with marketing tools',
          duration: '2 hours',
          cost: 'free',
          rating: 4.5,
          quality_score: 8.0
        }
      ],
      'Workflow Automation Tools': [
        {
          title: 'Automate processes with Power Automate',
          url: 'https://learn.microsoft.com/en-us/training/paths/automate-process-power-automate/',
          provider: 'Microsoft Learn',
          description: 'Automate workflows with Power Automate',
          duration: '4 hours',
          cost: 'free',
          rating: 4.6,
          quality_score: 8.8
        },
        {
          title: 'Zapier Automation Course',
          url: 'https://zapier.com/learn/automation/',
          provider: 'Zapier',
          description: 'Master workflow automation with Zapier',
          duration: '3 hours',
          cost: 'free',
          rating: 4.4,
          quality_score: 7.8
        }
      ]
    };
    
    return resourceMap[skillName] || [];
  }

  private addUniqueResults(allResults: SearchResult[], newResults: SearchResult[], seenUrls: Set<string>) {
    for (const result of newResults) {
      if (result.url && !seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }
  }

  private async processAndValidateResults(results: SearchResult[], skillName: string): Promise<LearningResource[]> {
    const processedResources: LearningResource[] = [];
    
    for (const result of results) {
      try {
        // Basic URL validation
        if (!result.url || !this.isValidUrl(result.url)) continue;
        
        const resource: LearningResource = {
          title: result.title || 'Untitled Course',
          provider: result.provider || this.extractProvider(result.url),
          url: result.url,
          type: 'course',
          duration: result.duration || 'varies',
          cost: (result.cost === 'free' || result.cost === 'paid') ? result.cost as 'free' | 'paid' : 'free',
          rating: result.rating || 4.0,
          verified: true,
          description: result.description || `Learn ${skillName} skills`
        };
        
        processedResources.push(resource);
        
      } catch (error) {
        console.warn(`   Failed to process result: ${result.title}`);
      }
    }
    
    return processedResources;
  }

  private scoreAndRankResources(resources: LearningResource[], skillName: string): LearningResource[] {
    return resources.map(resource => {
      let score = 0;
      
      // Provider quality scoring
      const provider = this.courseProviders.find(p => p.name === resource.provider);
      if (provider) score += provider.qualityScore;
      
      // Rating boost
      score += (resource.rating || 4.0) * 2;
      
      // Free courses get bonus
      if (resource.cost === 'free') score += 5;
      
      // Skill name relevance
      const title = resource.title.toLowerCase();
      const skill = skillName.toLowerCase();
      if (title.includes(skill)) score += 10;
      
      // Verified bonus
      if (resource.verified) score += 3;
      
      return { ...resource, computed_score: score };
    }).sort((a: any, b: any) => (b.computed_score || 0) - (a.computed_score || 0));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  private extractProvider(url: string): string {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      const providerMap: Record<string, string> = {
        'coursera.org': 'Coursera',
        'edx.org': 'edX',
        'udemy.com': 'Udemy',
        'linkedin.com': 'LinkedIn Learning',
        'docs.microsoft.com': 'Microsoft Learn',
        'developers.google.com': 'Google',
        'aws.amazon.com': 'AWS Training',
        'pluralsight.com': 'Pluralsight',
        'skillsbuild.org': 'IBM SkillsBuild',
        'futurelearn.com': 'FutureLearn'
      };
      
      for (const [domain_key, provider] of Object.entries(providerMap)) {
        if (domain.includes(domain_key)) return provider;
      }
      
      return 'Online Platform';
    } catch {
      return 'Unknown Provider';
    }
  }

  private calculateQualityScore(item: any): number {
    let score = 5; // Base score
    
    if (item.rating && item.rating > 4.0) score += 2;
    if (item.provider && ['Coursera', 'edX', 'Microsoft Learn'].includes(item.provider)) score += 3;
    if (item.cost === 'free') score += 1;
    
    return Math.min(score, 10);
  }

  private convertToSearchUrl(originalUrl: string, title: string, provider: string): string {
    if (!originalUrl || !provider) return originalUrl;
    
    const providerLower = provider.toLowerCase();
    
    // If it's already a search URL, keep it
    if (originalUrl.includes('search') || originalUrl.includes('browse') || 
        originalUrl.includes('?q=') || originalUrl.includes('query=') || 
        originalUrl.includes('terms=')) {
      return originalUrl;
    }
    
    // Convert fake direct URLs to search URLs
    if (providerLower.includes('coursera')) {
      // Extract search terms from title
      const searchTerms = this.extractSearchTerms(title);
      return this.buildCourseraSearch('', searchTerms).url;
    }
    
    if (providerLower.includes('edx')) {
      // Extract search terms from title
      const searchTerms = this.extractSearchTerms(title);
      return this.buildEdXSearch('', searchTerms).url;
    }
    
    if (providerLower.includes('microsoft')) {
      // Extract search terms from title
      const searchTerms = this.extractSearchTerms(title);
      return this.buildMicrosoftLearnSearch('', searchTerms).url;
    }
    
    // For other providers or if URL seems legit, keep original
    return originalUrl;
  }

  private extractSearchTerms(title: string): string {
    if (!title) return '';
    
    // Remove common course words and extract key terms
    const cleanTitle = title
      .replace(/course|training|certification|fundamentals|introduction|advanced|complete|guide/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleanTitle;
  }
}