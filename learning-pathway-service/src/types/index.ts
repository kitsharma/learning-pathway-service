// Core types for the Learning Pathway Service

export interface PathwayRequest {
  skills: string[];
  role: string;
  userId?: string;
  preferences?: {
    learningStyle: 'visual' | 'hands-on' | 'reading' | 'mixed';
    timeCommitment: 'part-time' | 'full-time' | 'flexible';
    budget: 'free' | 'low-cost' | 'premium';
  };
}

export interface PathwayResponse {
  success: boolean;
  pathway: {
    targetRole: string;
    currentSkills: string[];
    skillGaps: SkillGap[];
    estimatedTime: string;
    confidenceScore: number;
    alternatives: Alternative[];
  };
  encouragement: string;
}

export interface SkillGap {
  skill: string;
  priority: 'core' | 'complementary';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  resources: LearningResource[];
  milestones: Milestone[];
}

export interface LearningResource {
  title: string;
  provider: string;
  url: string;
  type: 'course' | 'article' | 'practice' | 'certification';
  duration: string;
  cost: 'free' | 'paid';
  rating: number;
  verified: boolean;
  description?: string;
}

export interface Milestone {
  id: string;
  description: string;
  estimatedHours: number;
}

export interface Alternative {
  role?: string;
  skill?: string;
  reason: string;
  confidence: number;
}

export interface Skill {
  name: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

export interface Role {
  name: string;
  category: string;
  demand: 'low' | 'medium' | 'high';
  avgSalary: number;
  description: string;
}

// Graph Database Interfaces
export interface GraphDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  findShortestPath(fromSkills: string[], toRole: string): Promise<PathResult>;
  getSkillResources(skillName: string): Promise<LearningResource[]>;
  getRoleAlternatives(roleName: string): Promise<Alternative[]>;
  addSkill(skill: Skill): Promise<void>;
  addRole(role: Role): Promise<void>;
  createRelationship(from: string, to: string, relationship: Relationship): Promise<void>;
}

export interface PathResult {
  path: GraphNode[];
  skillGaps: Skill[];
  confidence: number;
}

export interface GraphNode {
  id: string;
  type: 'skill' | 'role';
  properties: Record<string, any>;
}

export interface Relationship {
  type: string;
  properties: Record<string, any>;
}

export interface DatabaseConfig {
  type: 'memory' | 'neo4j';
  uri?: string;
  username?: string;
  password?: string;
  database?: string;
  connectionTimeout?: number;
  maxRetries?: number;
}