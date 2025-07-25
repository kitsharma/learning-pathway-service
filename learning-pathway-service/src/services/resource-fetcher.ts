import { LearningResource } from '../types';

interface SearchResult {
  title: string;
  url: string;
  description: string;
  rating?: number;
  provider?: string;
  cost?: string;
  duration?: string;
}

interface CourseSearchStrategy {
  name: string;
  searchFunction: (skillName: string) => Promise<SearchResult[]>;
}

export class ResourceFetcher {
  private perplexityApiKey: string;
  private googleApiKey: string;
  private searchStrategies: CourseSearchStrategy[];
  
  constructor() {
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
    this.googleApiKey = process.env.GOOGLE_AI_KEY || '';
    
    // Initialize search strategies in order of preference
    this.searchStrategies = [];
  }

  async findVerifiedResources(skillName: string): Promise<LearningResource[]> {
    try {
      // Search for courses and resources using Perplexity
      const searchQuery = `Find the best online courses and learning resources for "${skillName}" from reputable providers like Coursera, edX, Udemy, LinkedIn Learning, and Microsoft Learn. Include URLs, ratings, and whether they are free or paid.`;
      
      const perplexityResults = await this.searchWithPerplexity(searchQuery);
      
      // Process and verify results
      const resources: LearningResource[] = [];
      for (const result of perplexityResults) {
        const resource = await this.processSearchResult(result, skillName);
        if (resource) {
          resources.push(resource);
        }
      }
      
      // If no results from API, fall back to curated list
      if (resources.length === 0) {
        return this.getCuratedResources(skillName);
      }
      
      return resources.slice(0, 3); // Limit to top 3
      
    } catch (error: any) {
      console.warn(`Failed to fetch live resources for ${skillName}:`, error.message);
      return this.getCuratedResources(skillName);
    }
  }

  private async searchWithPerplexity(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [
            {
              role: 'user',
              content: query + ' Please provide specific course titles, URLs, providers, ratings (if available), and cost information. Format as JSON array.'
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data: any = await response.json();
      const content = data.choices[0]?.message?.content || '';
      
      // Try to extract structured data from response
      return this.parseSearchResponse(content);
      
    } catch (error: any) {
      console.warn('Perplexity search failed:', error.message);
      return [];
    }
  }

  private parseSearchResponse(content: string): SearchResult[] {
    try {
      // Try to parse JSON if present
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: parse structured text
      const results: SearchResult[] = [];
      const lines = content.split('\n');
      
      let currentResult: Partial<SearchResult> = {};
      
      for (const line of lines) {
        if (line.includes('Title:') || line.includes('Course:')) {
          if (currentResult.title) {
            results.push(currentResult as SearchResult);
            currentResult = {};
          }
          currentResult.title = line.split(':')[1]?.trim() || '';
        } else if (line.includes('URL:') || line.includes('Link:')) {
          currentResult.url = line.split('URL:')[1]?.split('Link:')[1]?.trim() || '';
        } else if (line.includes('Provider:')) {
          currentResult.description = line.split(':')[1]?.trim() || '';
        }
      }
      
      if (currentResult.title) {
        results.push(currentResult as SearchResult);
      }
      
      return results;
      
    } catch (error: any) {
      console.warn('Failed to parse search response:', error.message);
      return [];
    }
  }

  private async processSearchResult(result: SearchResult, skillName: string): Promise<LearningResource | null> {
    try {
      // Verify URL is accessible
      const isValidUrl = await this.verifyUrl(result.url);
      
      if (!isValidUrl) {
        return null;
      }

      // Determine provider from URL
      const provider = this.extractProvider(result.url);
      
      // Determine if it's free or paid based on provider and URL patterns
      const cost = this.determineCost(result.url, result.description);
      
      return {
        title: result.title,
        provider: provider,
        url: result.url,
        type: 'course',
        duration: 'varies', // Could be enhanced with more parsing
        cost: cost,
        rating: result.rating || 4.5,
        verified: true,
        description: result.description
      };
      
    } catch (error: any) {
      console.warn('Failed to process search result:', error.message);
      return null;
    }
  }

  private async verifyUrl(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      new URL(url);
      
      // Quick HEAD request to check if URL exists
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return response.ok;
      
    } catch (error) {
      return false;
    }
  }

  private extractProvider(url: string): string {
    const domain = new URL(url).hostname.toLowerCase();
    
    if (domain.includes('coursera')) return 'Coursera';
    if (domain.includes('edx')) return 'edX';
    if (domain.includes('udemy')) return 'Udemy';
    if (domain.includes('linkedin')) return 'LinkedIn Learning';
    if (domain.includes('microsoft') || domain.includes('docs.microsoft')) return 'Microsoft Learn';
    if (domain.includes('google')) return 'Google';
    if (domain.includes('youtube')) return 'YouTube';
    if (domain.includes('khan')) return 'Khan Academy';
    
    return 'Online Platform';
  }

  private determineCost(url: string, description: string): 'free' | 'paid' {
    const lowerUrl = url.toLowerCase();
    const lowerDesc = description.toLowerCase();
    
    // Known free patterns
    if (lowerUrl.includes('free') || 
        lowerDesc.includes('free') ||
        lowerUrl.includes('youtube') ||
        lowerUrl.includes('khan') ||
        lowerUrl.includes('microsoft.com/learn')) {
      return 'free';
    }
    
    return 'paid';
  }

  private getCuratedResources(skillName: string): LearningResource[] {
    const resourceMap: Record<string, LearningResource[]> = {
      'AI Tools Proficiency': [
        {
          title: 'AI For Everyone',
          provider: 'Coursera',
          url: 'https://www.coursera.org/learn/ai-for-everyone',
          type: 'course',
          duration: '4 weeks',
          cost: 'free',
          rating: 4.8,
          verified: true,
          description: 'Non-technical introduction to AI by Andrew Ng'
        },
        {
          title: 'Introduction to Artificial Intelligence',
          provider: 'edX',
          url: 'https://www.edx.org/course/introduction-to-artificial-intelligence-ai',
          type: 'course',
          duration: '6 weeks',
          cost: 'free',
          rating: 4.6,
          verified: true,
          description: 'Comprehensive AI fundamentals course'
        },
        {
          title: 'AI Fundamentals',
          provider: 'Microsoft Learn',
          url: 'https://docs.microsoft.com/learn/paths/get-started-with-artificial-intelligence-on-azure/',
          type: 'course',
          duration: '3 hours',
          cost: 'free',
          rating: 4.5,
          verified: true,
          description: 'Microsoft Azure AI fundamentals'
        }
      ],
      'Prompt Engineering': [
        {
          title: 'ChatGPT Prompt Engineering for Developers',
          provider: 'DeepLearning.AI',
          url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/',
          type: 'course',
          duration: '1 hour',
          cost: 'free',
          rating: 4.9,
          verified: true,
          description: 'Learn prompt engineering techniques'
        },
        {
          title: 'Prompt Engineering Guide',
          provider: 'Prompt Engineering Guide',
          url: 'https://www.promptingguide.ai/',
          type: 'article',
          duration: '2 hours',
          cost: 'free',
          rating: 4.7,
          verified: true,
          description: 'Comprehensive prompt engineering resource'
        },
        {
          title: 'Introduction to Prompt Design',
          provider: 'Google AI',
          url: 'https://developers.google.com/machine-learning/resources/prompt-eng',
          type: 'course',
          duration: '2 hours',
          cost: 'free',
          rating: 4.6,
          verified: true,
          description: 'Google\'s guide to effective prompting'
        }
      ],
      'Process Automation': [
        {
          title: 'Microsoft Power Automate Fundamentals',
          provider: 'Microsoft Learn',
          url: 'https://docs.microsoft.com/learn/paths/automate-process-power-automate/',
          type: 'course',
          duration: '4 hours',
          cost: 'free',
          rating: 4.6,
          verified: true,
          description: 'Learn workflow automation with Power Automate'
        },
        {
          title: 'RPA Developer Foundation',
          provider: 'UiPath Academy',
          url: 'https://academy.uipath.com/courses/rpa-developer-foundation',
          type: 'course',
          duration: '40 hours',
          cost: 'free',
          rating: 4.8,
          verified: true,
          description: 'Complete RPA development training'
        },
        {
          title: 'Zapier Automation Course',
          provider: 'Zapier',
          url: 'https://zapier.com/learn/automation/',
          type: 'course',
          duration: '3 hours',
          cost: 'free',
          rating: 4.5,
          verified: true,
          description: 'Learn to automate workflows with Zapier'
        }
      ],
      'Machine Learning Basics': [
        {
          title: 'Machine Learning for Everyone',
          provider: 'Coursera',
          url: 'https://www.coursera.org/learn/machine-learning-for-everyone',
          type: 'course',
          duration: '6 weeks',
          cost: 'free',
          rating: 4.7,
          verified: true,
          description: 'Non-technical introduction to machine learning'
        },
        {
          title: 'Introduction to Machine Learning',
          provider: 'edX',
          url: 'https://www.edx.org/course/introduction-to-machine-learning',
          type: 'course',
          duration: '8 weeks',
          cost: 'free',
          rating: 4.6,
          verified: true,
          description: 'Comprehensive ML fundamentals'
        },
        {
          title: 'Machine Learning Crash Course',
          provider: 'Google',
          url: 'https://developers.google.com/machine-learning/crash-course',
          type: 'course',
          duration: '15 hours',
          cost: 'free',
          rating: 4.8,
          verified: true,
          description: 'Google\'s fast-paced ML introduction'
        }
      ],
      'Data Visualization with AI': [
        {
          title: 'Data Visualization with Power BI',
          provider: 'Microsoft Learn',
          url: 'https://docs.microsoft.com/learn/paths/create-use-analytics-reports-power-bi/',
          type: 'course',
          duration: '6 hours',
          cost: 'free',
          rating: 4.7,
          verified: true,
          description: 'Create AI-powered visualizations with Power BI'
        },
        {
          title: 'Tableau Fundamentals',
          provider: 'Tableau',
          url: 'https://www.tableau.com/learn/training/20201-tableau-fundamentals',
          type: 'course',
          duration: '5 hours',
          cost: 'free',
          rating: 4.6,
          verified: true,
          description: 'Learn Tableau for data visualization'
        },
        {
          title: 'Python Data Visualization',
          provider: 'DataCamp',
          url: 'https://www.datacamp.com/courses/introduction-to-data-visualization-with-python',
          type: 'course',
          duration: '4 hours',
          cost: 'paid',
          rating: 4.5,
          verified: true,
          description: 'Python libraries for data visualization'
        }
      ]
    };

    return resourceMap[skillName] || [];
  }
}