# Interactive Learning Pathway Service

> AI-powered career transition service that helps displaced workers discover personalized learning pathways to AI-enhanced roles

## 🎯 Overview

The Interactive Learning Pathway Service is a comprehensive solution designed to help displaced workers transition to AI-enhanced careers through personalized, step-by-step learning plans. Built with empathy and positive psychology principles, it provides a collaborative approach to skill development that builds confidence and agency.

## ✨ Key Features

- **🤖 AI-Powered Pathway Generation**: Uses graph databases to find optimal learning paths
- **📚 Curated Learning Resources**: High-quality, verified courses from trusted providers
- **📊 Progress Tracking**: Visual progress indicators with milestone celebrations
- **🔄 Flexible Skill Management**: Add, remove, and explore alternative skills
- **🎯 Role-Specific Guidance**: Tailored pathways for AI-enhanced roles (non-engineering focused)
- **📱 Responsive Design**: Works seamlessly across desktop, tablet, and mobile
- **⚡ Scalable Architecture**: In-memory MVP with Neo4j production scaling path

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd learning-pathway-service

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build

# Start development server
npm run dev
```

### 🌐 Access the Service

Once running, access the service at:
- **Frontend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Documentation**: See API endpoints below

## 📡 API Endpoints

### Core Endpoints

```bash
# Health check
GET /health

# Get available roles
GET /api/roles

# Generate learning pathway
POST /api/generate-pathway
{
  "skills": ["Project Management", "Data Analysis"],
  "role": "AI-Enhanced Project Manager"
}

# Get skill suggestions
POST /api/skill-suggestions
{
  "skills": ["Project Management"]
}
```

### Sample Response

```json
{
  "success": true,
  "pathway": {
    "targetRole": "AI-Enhanced Project Manager",
    "currentSkills": ["Project Management", "Data Analysis"],
    "skillGaps": [
      {
        "skill": "AI Tools Proficiency",
        "priority": "core",
        "difficulty": "beginner",
        "estimatedHours": 20,
        "resources": [
          {
            "title": "AI For Everyone",
            "provider": "Coursera",
            "url": "https://www.coursera.org/learn/ai-for-everyone",
            "type": "course",
            "duration": "4 weeks",
            "cost": "free",
            "rating": 4.8,
            "verified": true
          }
        ],
        "milestones": [
          {
            "id": "ai-tools-1",
            "description": "Complete introduction to AI concepts",
            "estimatedHours": 2
          }
        ]
      }
    ],
    "estimatedTime": "6-8 weeks",
    "confidenceScore": 0.85,
    "alternatives": []
  },
  "encouragement": "🚀 Great foundation! Your 2 skills give you a strong starting point."
}
```

## 🏗️ Architecture

### Database Flexibility

The service uses an abstracted graph database interface that supports:

- **MVP**: In-memory graph database (no external dependencies)
- **Production**: Neo4j for scalable graph operations

Switch between databases using environment variables:

```env
# For MVP
GRAPH_DB_TYPE=memory

# For production
GRAPH_DB_TYPE=neo4j
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

### Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Tailwind CSS
- **Database**: In-memory graphs (MVP) / Neo4j (Production)
- **APIs**: Perplexity AI for live resource fetching
- **Testing**: Puppeteer for browser automation

## 🧪 Testing

### Run Browser Tests

```bash
# Install test dependencies
npm install -D puppeteer @types/puppeteer

# Run comprehensive browser tests
npx ts-node test-browser.ts
```

### Test Coverage

The test suite includes:
- ✅ Page load and rendering
- ✅ API endpoint functionality  
- ✅ Interactive UI components
- ✅ Progress tracking system
- ✅ Resource link validation
- ✅ Live API data integration
- ✅ Error handling
- ✅ Accessibility features
- ✅ Responsive design
- ✅ End-to-end user flows

## 🎨 User Experience Design

### Positive Psychology Features

- **Encouraging Language**: Gentle, supportive messaging throughout
- **Progress Celebrations**: Visual feedback for milestone completions
- **Agency & Control**: Users can modify skills and explore alternatives
- **Confidence Building**: Clear, achievable steps with time estimates
- **Non-Overwhelming**: Limited to 3 core skills max per pathway

### Human-Centered Design

- **Collaborative Feel**: "Co-create" rather than prescriptive
- **Progress Transparency**: Clear visual indicators of advancement
- **Flexible Exploration**: Easy skill swapping and role alternatives
- **Accessibility**: Keyboard navigation, proper heading structure
- **Mobile-First**: Responsive design for all devices

## 🔧 Configuration

### Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Database Configuration
GRAPH_DB_TYPE=memory  # or 'neo4j'

# API Keys (for live resource fetching)
PERPLEXITY_API_KEY=your_perplexity_key
GOOGLE_AI_KEY=your_google_ai_key

# Database Connection Settings
DB_CONNECTION_TIMEOUT=5000
DB_MAX_RETRIES=3

# Neo4j Configuration (if using Neo4j)
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=learning-pathways
```

## 📦 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY public ./public
EXPOSE 3001
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Marty Cagan's Empowered Product Teams**: Inspiration for collaborative approach
- **Positive Psychology Principles**: User experience design foundation
- **Neo4j Community**: Graph database relationship modeling
- **OpenAI & Perplexity**: AI-powered resource discovery

---

## 🎯 Sample Learning Pathways

### Project Manager → AI-Enhanced Project Manager

**Current Skills**: Project Management, Data Analysis  
**Learning Path**:
1. **AI Tools Proficiency** (20h) - Learn ChatGPT, AI assistants
2. **Prompt Engineering** (15h) - Craft effective AI prompts
3. **Process Automation** (25h) - Automate routine tasks

**Estimated Time**: 6-8 weeks  
**Confidence Score**: 85%

### Data Analyst → AI-Enhanced Data Analyst

**Current Skills**: Data Analysis, Excel  
**Learning Path**:
1. **AI Tools Proficiency** (20h) - AI-powered analytics
2. **Machine Learning Basics** (30h) - No-code ML tools
3. **Data Visualization with AI** (25h) - AI-enhanced dashboards

**Estimated Time**: 8-10 weeks  
**Confidence Score**: 82%

Built with ❤️ for career transformation and human empowerment.