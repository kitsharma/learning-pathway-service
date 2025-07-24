import neo4j, { Driver } from 'neo4j-driver';
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

export class Neo4jGraphDatabase implements GraphDatabase {
  private driver: Driver | null = null;
  private database: string;

  constructor(private config: DatabaseConfig) {
    this.database = config.database || 'neo4j';
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.uri || !this.config.username || !this.config.password) {
        throw new Error('Neo4j configuration incomplete');
      }

      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      );
      
      await this.driver.verifyConnectivity();
      console.log('✅ Connected to Neo4j database');
    } catch (error: any) {
      throw new Error(`Failed to connect to Neo4j: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('📴 Disconnected from Neo4j database');
    }
  }

  async findShortestPath(fromSkills: string[], toRole: string): Promise<PathResult> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        MATCH (currentSkill:Skill)
        WHERE currentSkill.name IN $skills
        MATCH (targetRole:Role {name: $role})
        MATCH path = shortestPath((currentSkill)-[*..3]-(targetRole))
        WITH path, 
             [skill IN nodes(path) WHERE skill:Skill AND NOT skill.name IN $skills] as skillGaps,
             reduce(conf = 0.0, rel IN relationships(path) | conf + coalesce(rel.strength, 0.5)) / length(relationships(path)) as confidence
        RETURN path, skillGaps, confidence
        ORDER BY confidence DESC, length(path) ASC
        LIMIT 1
      `;

      const result = await session.run(query, {
        skills: fromSkills,
        role: toRole
      });

      if (result.records.length === 0) {
        // Fallback: get required skills for role
        const fallbackQuery = `
          MATCH (role:Role {name: $role})<-[:REQUIRED_FOR]-(skill:Skill)
          RETURN skill
          ORDER BY skill.priority DESC
          LIMIT 3
        `;
        
        const fallbackResult = await session.run(fallbackQuery, { role: toRole });
        
        return {
          path: [],
          skillGaps: fallbackResult.records.map(record => ({
            name: record.get('skill').properties.name,
            category: record.get('skill').properties.category,
            difficulty: record.get('skill').properties.difficulty,
            estimatedHours: this.estimateHours(record.get('skill').properties.difficulty)
          })),
          confidence: 0.6
        };
      }

      const record = result.records[0];
      const path = record.get('path');
      const skillGaps = record.get('skillGaps');
      const confidence = record.get('confidence');

      return {
        path: path.segments.flatMap((segment: any) => [segment.start, segment.end]),
        skillGaps: skillGaps.slice(0, 3).map((skillNode: any) => ({
          name: skillNode.properties.name,
          category: skillNode.properties.category,
          difficulty: skillNode.properties.difficulty,
          estimatedHours: this.estimateHours(skillNode.properties.difficulty)
        })),
        confidence: Math.min(confidence, 1.0)
      };
    } finally {
      await session.close();
    }
  }

  async getSkillResources(skillName: string): Promise<LearningResource[]> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        MATCH (skill:Skill {name: $skillName})-[:TAUGHT_BY]-(resource:Resource)
        RETURN resource
        ORDER BY resource.rating DESC, resource.cost ASC
        LIMIT 3
      `;
      
      const result = await session.run(query, { skillName });
      
      return result.records.map((record: any) => ({
        title: record.get('resource').properties.title,
        provider: record.get('resource').properties.provider,
        url: record.get('resource').properties.url,
        type: record.get('resource').properties.type,
        duration: record.get('resource').properties.duration,
        cost: record.get('resource').properties.cost,
        rating: record.get('resource').properties.rating,
        verified: record.get('resource').properties.verified
      }));
    } finally {
      await session.close();
    }
  }

  async getRoleAlternatives(roleName: string): Promise<Alternative[]> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        MATCH (role:Role {name: $roleName})
        MATCH (altRole:Role)
        WHERE role.category = altRole.category AND role <> altRole
        RETURN altRole, 
               0.8 as similarity
        ORDER BY similarity DESC
        LIMIT 3
      `;
      
      const result = await session.run(query, { roleName });
      
      return result.records.map((record: any) => ({
        role: record.get('altRole').properties.name,
        reason: `Similar ${record.get('altRole').properties.category.toLowerCase()} role`,
        confidence: record.get('similarity')
      }));
    } finally {
      await session.close();
    }
  }

  async addSkill(skill: Skill): Promise<void> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        CREATE (s:Skill {
          name: $name,
          category: $category,
          difficulty: $difficulty,
          estimatedHours: $estimatedHours
        })
      `;
      
      await session.run(query, skill);
    } finally {
      await session.close();
    }
  }

  async addRole(role: Role): Promise<void> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        CREATE (r:Role {
          name: $name,
          category: $category,
          demand: $demand,
          avgSalary: $avgSalary,
          description: $description
        })
      `;
      
      await session.run(query, role);
    } finally {
      await session.close();
    }
  }

  async createRelationship(from: string, to: string, relationship: Relationship): Promise<void> {
    if (!this.driver) throw new Error('Database not connected');
    
    const session = this.driver.session({ database: this.database });
    
    try {
      const query = `
        MATCH (a {name: $from}), (b {name: $to})
        CREATE (a)-[r:${relationship.type} $props]->(b)
      `;
      
      await session.run(query, {
        from,
        to,
        props: relationship.properties
      });
    } finally {
      await session.close();
    }
  }

  private estimateHours(difficulty: string): number {
    const hourMap: Record<string, number> = {
      'beginner': 15,
      'intermediate': 25,
      'advanced': 40
    };
    return hourMap[difficulty] || 20;
  }
}