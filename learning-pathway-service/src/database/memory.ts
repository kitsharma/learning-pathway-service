import { 
  GraphDatabase, 
  PathResult, 
  GraphNode, 
  LearningResource, 
  Alternative, 
  Skill, 
  Role, 
  Relationship,
  DatabaseConfig 
} from '../types';

export class InMemoryGraphDatabase implements GraphDatabase {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  private relationships: Map<string, Relationship[]> = new Map();

  constructor(private config: DatabaseConfig) {}

  async connect(): Promise<void> {
    await this.seedData();
    console.log('✅ Connected to in-memory graph database');
  }

  async disconnect(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.relationships.clear();
    console.log('📴 Disconnected from in-memory database');
  }

  async findShortestPath(fromSkills: string[], toRole: string): Promise<PathResult> {
    const targetNode = this.findNode(toRole, 'role');
    if (!targetNode) {
      throw new Error(`Role "${toRole}" not found`);
    }

    let bestPath: GraphNode[] = [];
    let skillGaps: Skill[] = [];
    let maxConfidence = 0;

    // For each current skill, find path to target role
    for (const skillName of fromSkills) {
      const skillNode = this.findNode(skillName, 'skill');
      if (!skillNode) continue;

      const path = this.dijkstra(skillNode.id, targetNode.id);
      if (path.length > 0) {
        const pathConfidence = this.calculatePathConfidence(path);
        if (pathConfidence > maxConfidence) {
          maxConfidence = pathConfidence;
          bestPath = path.map(nodeId => this.nodes.get(nodeId)!);
          
          // Extract skill gaps (skills in path that user doesn't have)
          skillGaps = bestPath
            .filter(node => node.type === 'skill' && !fromSkills.includes(node.properties.name))
            .map(node => ({
              name: node.properties.name,
              category: node.properties.category,
              difficulty: node.properties.difficulty,
              estimatedHours: this.estimateHours(node.properties.difficulty)
            }));
        }
      }
    }

    // If no direct path found, find required skills for the role
    if (bestPath.length === 0) {
      skillGaps = this.getRequiredSkillsForRole(toRole);
      maxConfidence = 0.6; // Base confidence for role requirements
    }

    return {
      path: bestPath,
      skillGaps: skillGaps.slice(0, 3), // Limit to 3 core skills
      confidence: maxConfidence
    };
  }

  async getSkillResources(skillName: string): Promise<LearningResource[]> {
    // Try to fetch live resources first
    const { EnhancedResourceFetcher } = require('../services/enhanced-resource-fetcher');
    const fetcher = new EnhancedResourceFetcher();
    
    try {
      return await fetcher.findVerifiedResources(skillName);
    } catch (error) {
      console.warn(`Failed to fetch live resources for ${skillName}, using fallback`);
      
      // Fallback to curated resources if API fails
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
          }
        ]
      };

      return resourceMap[skillName] || [];
    }
  }

  async getRoleAlternatives(roleName: string): Promise<Alternative[]> {
    const roleNode = this.findNode(roleName, 'role');
    if (!roleNode) return [];

    const category = roleNode.properties.category;
    const alternatives: Alternative[] = [];

    // Find roles in same category
    for (const [nodeId, node] of this.nodes) {
      if (node.type === 'role' && 
          node.properties.category === category && 
          node.properties.name !== roleName) {
        alternatives.push({
          role: node.properties.name,
          reason: `Similar ${category.toLowerCase()} role`,
          confidence: 0.8
        });
      }
    }

    return alternatives.slice(0, 3);
  }

  // Dijkstra's algorithm for shortest path
  private dijkstra(startId: string, endId: string): string[] {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize distances
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, nodeId === startId ? 0 : Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId)!;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (!currentNode || minDistance === Infinity) break;

      unvisited.delete(currentNode);

      if (currentNode === endId) {
        // Reconstruct path
        const path: string[] = [];
        let current: string | null = endId;
        
        while (current !== null) {
          path.unshift(current);
          current = previous.get(current) || null;
        }
        
        return path;
      }

      // Check neighbors
      const neighbors = this.edges.get(currentNode) || new Set();
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) continue;

        const edgeWeight = this.getEdgeWeight(currentNode, neighbor);
        const newDistance = minDistance + edgeWeight;

        if (newDistance < distances.get(neighbor)!) {
          distances.set(neighbor, newDistance);
          previous.set(neighbor, currentNode);
        }
      }
    }

    return []; // No path found
  }

  private getEdgeWeight(from: string, to: string): number {
    const relationships = this.relationships.get(`${from}-${to}`) || [];
    if (relationships.length === 0) return 1;
    
    // Lower weight for stronger relationships
    const strength = relationships[0].properties.strength || 0.5;
    return 1 / strength;
  }

  private calculatePathConfidence(path: string[]): number {
    if (path.length <= 1) return 1;
    
    let totalConfidence = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const relationships = this.relationships.get(`${path[i]}-${path[i + 1]}`) || [];
      const strength = relationships[0]?.properties.strength || 0.5;
      totalConfidence += strength;
    }
    
    return totalConfidence / (path.length - 1);
  }

  private findNode(name: string, type: 'skill' | 'role'): GraphNode | null {
    for (const node of this.nodes.values()) {
      if (node.type === type && node.properties.name === name) {
        return node;
      }
    }
    return null;
  }

  private getRequiredSkillsForRole(roleName: string): Skill[] {
    // Hardcoded for MVP - in production this would be in the graph
    const roleSkillMap: Record<string, Skill[]> = {
      'AI-Enhanced Customer Experience Specialist': [
        {
          name: 'AI-Powered Customer Analytics',
          category: 'Analytics',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Conversational AI Management',
          category: 'AI',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'Customer Journey Automation',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Administrative Coordinator': [
        {
          name: 'Workflow Automation Tools',
          category: 'Technology',
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          name: 'AI-Assisted Scheduling',
          category: 'AI',
          difficulty: 'beginner',
          estimatedHours: 15
        },
        {
          name: 'Document Intelligence Systems',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 25
        }
      ],
      'AI-Enhanced Financial Services Advisor': [
        {
          name: 'FinTech AI Applications',
          category: 'Finance',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'Robo-Advisory Platforms',
          category: 'Finance',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'Financial Risk AI Analysis',
          category: 'Analytics',
          difficulty: 'advanced',
          estimatedHours: 45
        }
      ],
      'AI-Enhanced Healthcare Information Manager': [
        {
          name: 'Healthcare AI Systems',
          category: 'Healthcare',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Medical Data Analytics',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'Health Information Automation',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Retail Operations Manager': [
        {
          name: 'Inventory Optimization AI',
          category: 'Operations',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Customer Behavior Analytics',
          category: 'Analytics',
          difficulty: 'beginner',
          estimatedHours: 30
        },
        {
          name: 'Retail Automation Systems',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 40
        }
      ],
      'AI-Enhanced Human Resources Specialist': [
        {
          name: 'AI Recruitment Tools',
          category: 'HR',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'People Analytics',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Employee Experience AI',
          category: 'HR',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Marketing Communications Manager': [
        {
          name: 'AI Content Generation',
          category: 'Marketing',
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          name: 'Marketing Automation Platforms',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Campaign Performance AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Operations Analyst': [
        {
          name: 'Process Mining and AI',
          category: 'Operations',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'Predictive Operations Analytics',
          category: 'Analytics',
          difficulty: 'advanced',
          estimatedHours: 45
        },
        {
          name: 'Business Intelligence AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Quality Assurance Coordinator': [
        {
          name: 'Automated Testing with AI',
          category: 'Quality',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Quality Analytics and Prediction',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'AI-Driven Process Improvement',
          category: 'Operations',
          difficulty: 'intermediate',
          estimatedHours: 40
        }
      ],
      'AI-Enhanced Business Intelligence Analyst': [
        {
          name: 'Advanced AI Analytics',
          category: 'Analytics',
          difficulty: 'advanced',
          estimatedHours: 50
        },
        {
          name: 'Machine Learning for Business',
          category: 'AI',
          difficulty: 'intermediate',
          estimatedHours: 45
        },
        {
          name: 'Data Storytelling with AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Content Strategy Manager': [
        {
          name: 'AI Content Planning',
          category: 'Content',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Content Performance AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'SEO and AI Optimization',
          category: 'Marketing',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Sales Development Representative': [
        {
          name: 'Sales AI and CRM',
          category: 'Sales',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Lead Scoring with AI',
          category: 'Sales',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'Sales Forecasting AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Process Improvement Specialist': [
        {
          name: 'Process Automation Design',
          category: 'Operations',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'AI-Driven Efficiency Analysis',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Change Management with AI',
          category: 'Management',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Training and Development Coordinator': [
        {
          name: 'AI-Powered Learning Platforms',
          category: 'Education',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Learning Analytics',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'Personalized Learning AI',
          category: 'Education',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Compliance and Risk Analyst': [
        {
          name: 'RegTech and AI Compliance',
          category: 'Compliance',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'Risk Prediction AI',
          category: 'Analytics',
          difficulty: 'advanced',
          estimatedHours: 45
        },
        {
          name: 'Automated Compliance Monitoring',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Event Coordination Manager': [
        {
          name: 'Event Planning AI Tools',
          category: 'Events',
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          name: 'Attendee Experience Analytics',
          category: 'Analytics',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Virtual Event Technology',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Research and Insights Analyst': [
        {
          name: 'AI Research Methodologies',
          category: 'Research',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Data Mining with AI',
          category: 'Analytics',
          difficulty: 'advanced',
          estimatedHours: 40
        },
        {
          name: 'Insight Generation AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        }
      ],
      'AI-Enhanced Digital Marketing Specialist': [
        {
          name: 'Digital Marketing AI Tools',
          category: 'Marketing',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Programmatic Advertising',
          category: 'Marketing',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Marketing Attribution AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Supply Chain Coordinator': [
        {
          name: 'Supply Chain AI Optimization',
          category: 'Operations',
          difficulty: 'intermediate',
          estimatedHours: 40
        },
        {
          name: 'Demand Forecasting AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Logistics Automation',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ],
      'AI-Enhanced Customer Success Manager': [
        {
          name: 'Customer Health Scoring AI',
          category: 'Customer Success',
          difficulty: 'beginner',
          estimatedHours: 25
        },
        {
          name: 'Churn Prediction Models',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 35
        },
        {
          name: 'Customer Lifecycle Automation',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 30
        }
      ]
    };

    return roleSkillMap[roleName] || [];
  }

  private estimateHours(difficulty: string): number {
    const hourMap: Record<string, number> = {
      'beginner': 15,
      'intermediate': 25,
      'advanced': 40
    };
    return hourMap[difficulty] || 20;
  }

  async addSkill(skill: Skill): Promise<void> {
    const id = `skill-${skill.name.toLowerCase().replace(/\s+/g, '-')}`;
    this.nodes.set(id, {
      id,
      type: 'skill',
      properties: skill
    });
  }

  async addRole(role: Role): Promise<void> {
    const id = `role-${role.name.toLowerCase().replace(/\s+/g, '-')}`;
    this.nodes.set(id, {
      id,
      type: 'role',
      properties: role
    });
  }

  async createRelationship(from: string, to: string, relationship: Relationship): Promise<void> {
    const key = `${from}-${to}`;
    
    if (!this.edges.has(from)) {
      this.edges.set(from, new Set());
    }
    this.edges.get(from)!.add(to);

    if (!this.relationships.has(key)) {
      this.relationships.set(key, []);
    }
    this.relationships.get(key)!.push(relationship);
  }

  private async seedData(): Promise<void> {
    // Add skills
    await this.addSkill({
      name: 'Project Management',
      category: 'Management',
      difficulty: 'intermediate',
      estimatedHours: 0 // Already possessed
    });

    await this.addSkill({
      name: 'Data Analysis',
      category: 'Analytics',
      difficulty: 'intermediate',
      estimatedHours: 0
    });

    await this.addSkill({
      name: 'AI Tools Proficiency',
      category: 'Technology',
      difficulty: 'beginner',
      estimatedHours: 20
    });

    await this.addSkill({
      name: 'Prompt Engineering',
      category: 'AI',
      difficulty: 'beginner',
      estimatedHours: 15
    });

    await this.addSkill({
      name: 'Process Automation',
      category: 'Technology',
      difficulty: 'intermediate',
      estimatedHours: 25
    });

    await this.addSkill({
      name: 'Machine Learning Basics',
      category: 'Analytics',
      difficulty: 'intermediate',
      estimatedHours: 30
    });

    await this.addSkill({
      name: 'Data Visualization with AI',
      category: 'Analytics',
      difficulty: 'intermediate',
      estimatedHours: 25
    });

    // Add roles - focusing on AI-enhanced versions of displacement-impacted positions
    await this.addRole({
      name: 'AI-Enhanced Customer Experience Specialist',
      category: 'Customer Service',
      demand: 'high',
      avgSalary: 68000,
      description: 'Customer service professionals who use AI analytics and automation to enhance customer experiences'
    });

    await this.addRole({
      name: 'AI-Enhanced Administrative Coordinator',
      category: 'Administration',
      demand: 'high',
      avgSalary: 55000,
      description: 'Administrative professionals who leverage AI for workflow automation and intelligent document management'
    });

    await this.addRole({
      name: 'AI-Enhanced Financial Services Advisor',
      category: 'Finance',
      demand: 'high',
      avgSalary: 78000,
      description: 'Financial advisors who integrate AI-powered analytics and robo-advisory tools in client service'
    });

    await this.addRole({
      name: 'AI-Enhanced Healthcare Information Manager',
      category: 'Healthcare',
      demand: 'high',
      avgSalary: 72000,
      description: 'Healthcare information professionals using AI for medical data analysis and workflow optimization'
    });

    await this.addRole({
      name: 'AI-Enhanced Retail Operations Manager',
      category: 'Retail',
      demand: 'high',
      avgSalary: 65000,
      description: 'Retail managers who use AI for inventory optimization, customer behavior analysis, and operations'
    });

    await this.addRole({
      name: 'AI-Enhanced Human Resources Specialist',
      category: 'Human Resources',
      demand: 'high',
      avgSalary: 70000,
      description: 'HR professionals who leverage AI recruitment tools, people analytics, and employee experience AI'
    });

    await this.addRole({
      name: 'AI-Enhanced Marketing Communications Manager',
      category: 'Marketing',
      demand: 'high',
      avgSalary: 75000,
      description: 'Marketing professionals who use AI content generation, automation platforms, and performance analytics'
    });

    await this.addRole({
      name: 'AI-Enhanced Operations Analyst',
      category: 'Operations',
      demand: 'high',
      avgSalary: 82000,
      description: 'Operations analysts who apply AI for process mining, predictive analytics, and business intelligence'
    });

    await this.addRole({
      name: 'AI-Enhanced Quality Assurance Coordinator',
      category: 'Quality',
      demand: 'high',
      avgSalary: 68000,
      description: 'QA professionals who implement AI-driven testing, quality analytics, and process improvement'
    });

    await this.addRole({
      name: 'AI-Enhanced Business Intelligence Analyst',
      category: 'Analytics',
      demand: 'high',
      avgSalary: 88000,
      description: 'BI analysts who use advanced AI analytics, machine learning, and automated data storytelling'
    });

    await this.addRole({
      name: 'AI-Enhanced Content Strategy Manager',
      category: 'Content',
      demand: 'high',
      avgSalary: 72000,
      description: 'Content managers who leverage AI for content planning, performance analysis, and SEO optimization'
    });

    await this.addRole({
      name: 'AI-Enhanced Sales Development Representative',
      category: 'Sales',
      demand: 'high',
      avgSalary: 62000,
      description: 'Sales professionals who use AI-powered CRM, lead scoring, and sales forecasting tools'
    });

    await this.addRole({
      name: 'AI-Enhanced Process Improvement Specialist',
      category: 'Operations',
      demand: 'high',
      avgSalary: 78000,
      description: 'Process improvement experts who design automation and use AI for efficiency analysis and change management'
    });

    await this.addRole({
      name: 'AI-Enhanced Training and Development Coordinator',
      category: 'Education',
      demand: 'medium',
      avgSalary: 65000,
      description: 'Training coordinators who use AI-powered learning platforms, analytics, and personalized learning systems'
    });

    await this.addRole({
      name: 'AI-Enhanced Compliance and Risk Analyst',
      category: 'Compliance',
      demand: 'high',
      avgSalary: 85000,
      description: 'Compliance professionals who leverage RegTech AI, risk prediction models, and automated monitoring'
    });

    await this.addRole({
      name: 'AI-Enhanced Event Coordination Manager',
      category: 'Events',
      demand: 'medium',
      avgSalary: 58000,
      description: 'Event coordinators who use AI planning tools, attendee analytics, and virtual event technology'
    });

    await this.addRole({
      name: 'AI-Enhanced Research and Insights Analyst',
      category: 'Research',
      demand: 'high',
      avgSalary: 75000,
      description: 'Research analysts who apply AI methodologies, data mining, and automated insight generation'
    });

    await this.addRole({
      name: 'AI-Enhanced Digital Marketing Specialist',
      category: 'Marketing',
      demand: 'high',
      avgSalary: 68000,
      description: 'Digital marketers who use AI tools, programmatic advertising, and marketing attribution systems'
    });

    await this.addRole({
      name: 'AI-Enhanced Supply Chain Coordinator',
      category: 'Operations',
      demand: 'high',
      avgSalary: 70000,
      description: 'Supply chain professionals who optimize operations with AI, demand forecasting, and logistics automation'
    });

    await this.addRole({
      name: 'AI-Enhanced Customer Success Manager',
      category: 'Customer Success',
      demand: 'high',
      avgSalary: 80000,
      description: 'Customer success managers who use AI health scoring, churn prediction, and lifecycle automation'
    });

    // Create relationships (simplified for MVP)
    const pmId = 'skill-project-management';
    const daId = 'skill-data-analysis';
    const aiId = 'skill-ai-tools-proficiency';
    const promptId = 'skill-prompt-engineering';
    const autoId = 'skill-process-automation';
    const mlId = 'skill-machine-learning-basics';
    const vizId = 'skill-data-visualization-with-ai';
    const aiPmRoleId = 'role-ai-enhanced-project-manager';
    const aiDaRoleId = 'role-ai-enhanced-data-analyst';

    // Skills lead to AI-Enhanced PM role
    await this.createRelationship(pmId, aiPmRoleId, {
      type: 'LEADS_TO',
      properties: { strength: 0.8, effort: 'low' }
    });

    await this.createRelationship(daId, aiDaRoleId, {
      type: 'LEADS_TO',
      properties: { strength: 0.8, effort: 'low' }
    });

    // Required skills for AI-Enhanced PM role
    await this.createRelationship(aiId, aiPmRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'core', strength: 0.9 }
    });

    await this.createRelationship(promptId, aiPmRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'core', strength: 0.8 }
    });

    await this.createRelationship(autoId, aiPmRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'complementary', strength: 0.6 }
    });

    // Required skills for AI-Enhanced Data Analyst role
    await this.createRelationship(aiId, aiDaRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'core', strength: 0.9 }
    });

    await this.createRelationship(mlId, aiDaRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'core', strength: 0.8 }
    });

    await this.createRelationship(vizId, aiDaRoleId, {
      type: 'REQUIRED_FOR',
      properties: { priority: 'complementary', strength: 0.7 }
    });

    console.log('🌱 Seeded in-memory database with sample data');
  }
}