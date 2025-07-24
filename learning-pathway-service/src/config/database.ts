import { DatabaseConfig } from '../types';

export class ConfigManager {
  static getDatabaseConfig(): DatabaseConfig {
    const config: DatabaseConfig = {
      type: (process.env.GRAPH_DB_TYPE as 'memory' | 'neo4j') || 'memory',
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3')
    };

    if (config.type === 'neo4j') {
      // Validate Neo4j required config
      if (!process.env.NEO4J_URI || !process.env.NEO4J_USERNAME || !process.env.NEO4J_PASSWORD) {
        console.warn('⚠️  Neo4j configuration incomplete. Falling back to in-memory database.');
        config.type = 'memory';
      } else {
        config.uri = process.env.NEO4J_URI;
        config.username = process.env.NEO4J_USERNAME;
        config.password = process.env.NEO4J_PASSWORD;
        config.database = process.env.NEO4J_DATABASE || 'neo4j';
      }
    }

    return config;
  }

  static validateConfig(config: DatabaseConfig): void {
    if (!['memory', 'neo4j'].includes(config.type)) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    if (config.type === 'neo4j') {
      const required = ['uri', 'username', 'password'];
      const missing = required.filter(field => !config[field as keyof DatabaseConfig]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required Neo4j config: ${missing.join(', ')}`);
      }
    }
  }
}