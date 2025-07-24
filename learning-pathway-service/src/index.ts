import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { ConfigManager } from './config/database';
import { GraphDatabaseFactory } from './database/factory';
import { PathwayService } from './services/pathway';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Global variables
let pathwayService: PathwayService;

// Initialize service
async function initializeService() {
  try {
    // Load and validate configuration
    const config = ConfigManager.getDatabaseConfig();
    ConfigManager.validateConfig(config);
    
    console.log(`🚀 Starting Learning Pathway Service with ${config.type} database`);
    
    // Create database instance
    const graphDB = GraphDatabaseFactory.create(config.type, config);
    
    // Initialize service
    pathwayService = new PathwayService(graphDB);
    await pathwayService.initialize();
    
    console.log('✅ Service initialized successfully');
    
  } catch (error: any) {
    console.error('❌ Failed to initialize service:', error.message);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: process.env.GRAPH_DB_TYPE || 'memory',
    timestamp: new Date().toISOString(),
    service: 'Learning Pathway API'
  });
});

app.post('/api/generate-pathway', async (req, res) => {
  try {
    if (!pathwayService) {
      return res.status(503).json({
        success: false,
        message: 'Service not initialized'
      });
    }

    const pathway = await pathwayService.generatePathway(req.body);
    res.json(pathway);
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/roles', async (req, res) => {
  try {
    if (!pathwayService) {
      return res.status(503).json({
        success: false,
        message: 'Service not initialized'
      });
    }

    const roles = await pathwayService.getAvailableRoles();
    res.json({ success: true, roles });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/skill-suggestions', async (req, res) => {
  try {
    if (!pathwayService) {
      return res.status(503).json({
        success: false,
        message: 'Service not initialized'
      });
    }

    const { skills } = req.body;
    const suggestions = await pathwayService.getSkillSuggestions(skills || []);
    res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down gracefully...');
  if (pathwayService) {
    await pathwayService.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Shutting down gracefully...');
  if (pathwayService) {
    await pathwayService.shutdown();
  }
  process.exit(0);
});

// Start server
async function startServer() {
  await initializeService();
  
  app.listen(PORT, () => {
    console.log(`🌐 Learning Pathway API running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.GRAPH_DB_TYPE || 'memory'}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📚 Available endpoints:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/api/roles`);
    console.log(`   POST http://localhost:${PORT}/api/generate-pathway`);
    console.log(`   POST http://localhost:${PORT}/api/skill-suggestions`);
  });
}

// Start the application
startServer().catch(console.error);