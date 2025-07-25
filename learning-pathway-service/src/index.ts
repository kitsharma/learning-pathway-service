import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { ConfigManager } from './config/database';
import { GraphDatabaseFactory } from './database/factory';
import { PathwayService } from './services/pathway';
import { ResumeParser } from './services/resume-parser';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

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

// Resume upload and parsing endpoint
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const resumeParser = new ResumeParser();
    const fs = await import('fs');
    
    // Read file buffer
    const buffer = await fs.promises.readFile(req.file.path);
    
    // Parse resume
    const parseResult = await resumeParser.parseResume(
      buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    // Clean up uploaded file
    await fs.promises.unlink(req.file.path);
    
    // Convert extracted skills to the format expected by the frontend
    const formattedSkills = parseResult.skills
      .filter(skill => skill.confidence >= 0.7) // Only high confidence skills
      .slice(0, 10) // Limit to top 10 skills
      .map(skill => skill.name);
    
    res.json({
      success: true,
      data: {
        skills: formattedSkills,
        detailedSkills: parseResult.skills,
        piiItems: parseResult.piiItems,
        redactedText: parseResult.redactedText,
        metadata: parseResult.metadata
      }
    });
    
  } catch (error: any) {
    console.error('Resume upload error:', error);
    
    // Clean up file if it exists
    if (req.file) {
      const fs = await import('fs');
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process resume'
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
  try {
    await initializeService();
    
    const server = app.listen(PORT, () => {
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
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();