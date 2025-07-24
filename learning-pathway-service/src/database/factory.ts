import { GraphDatabase, DatabaseConfig } from '../types';
import { InMemoryGraphDatabase } from './memory';
import { Neo4jGraphDatabase } from './neo4j';

export class GraphDatabaseFactory {
  static create(type: 'memory' | 'neo4j', config: DatabaseConfig): GraphDatabase {
    switch (type) {
      case 'memory':
        return new InMemoryGraphDatabase(config);
      case 'neo4j':
        return new Neo4jGraphDatabase(config);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}