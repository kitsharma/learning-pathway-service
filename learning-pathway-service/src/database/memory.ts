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
    const ResourceFetcher = require('../services/resource-fetcher').ResourceFetcher;
    const fetcher = new ResourceFetcher();
    
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
      'AI-Enhanced Project Manager': [
        {
          name: 'AI Tools Proficiency',
          category: 'Technology',
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          name: 'Prompt Engineering',
          category: 'AI',
          difficulty: 'beginner',
          estimatedHours: 15
        },
        {
          name: 'Process Automation',
          category: 'Technology',
          difficulty: 'intermediate',
          estimatedHours: 25
        }
      ],
      'AI-Enhanced Data Analyst': [
        {
          name: 'AI Tools Proficiency',
          category: 'Technology',
          difficulty: 'beginner',
          estimatedHours: 20
        },
        {
          name: 'Machine Learning Basics',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 30
        },
        {
          name: 'Data Visualization with AI',
          category: 'Analytics',
          difficulty: 'intermediate',
          estimatedHours: 25
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

    // Add roles
    await this.addRole({
      name: 'AI-Enhanced Project Manager',
      category: 'Management',
      demand: 'high',
      avgSalary: 95000,
      description: 'Project managers who leverage AI tools for planning, risk assessment, and team coordination'
    });

    await this.addRole({
      name: 'AI-Enhanced Data Analyst',
      category: 'Analytics',
      demand: 'high',
      avgSalary: 85000,
      description: 'Data analysts who use AI tools for advanced insights and automated reporting'
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