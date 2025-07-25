import { 
  PathwayRequest, 
  PathwayResponse, 
  SkillGap, 
  Milestone, 
  GraphDatabase,
  Alternative 
} from '../types';

export class PathwayService {
  constructor(private graphDB: GraphDatabase) {}

  async initialize(): Promise<void> {
    await this.graphDB.connect();
  }

  async shutdown(): Promise<void> {
    await this.graphDB.disconnect();
  }

  async generatePathway(request: PathwayRequest): Promise<PathwayResponse> {
    try {
      // Find shortest path using abstracted interface
      const pathResult = await this.graphDB.findShortestPath(
        request.skills,
        request.role
      );

      // Enrich skill gaps with resources and milestones
      const enrichedSkillGaps = await Promise.all(
        pathResult.skillGaps.map(async (skillGap) => {
          const resources = await this.graphDB.getSkillResources(skillGap.name);
          
          return {
            skill: skillGap.name,
            priority: 'core' as const,
            difficulty: skillGap.difficulty,
            estimatedHours: skillGap.estimatedHours,
            resources: resources.slice(0, 3), // Limit to top 3 resources
            milestones: this.generateMilestones(skillGap.name, skillGap.estimatedHours)
          };
        })
      );

      // Get role alternatives
      const alternatives = await this.graphDB.getRoleAlternatives(request.role);

      return {
        success: true,
        pathway: {
          targetRole: request.role,
          currentSkills: request.skills,
          skillGaps: enrichedSkillGaps,
          estimatedTime: this.calculateEstimatedTime(enrichedSkillGaps),
          confidenceScore: pathResult.confidence,
          alternatives: alternatives.slice(0, 3)
        },
        encouragement: this.generateEncouragement(request.skills, enrichedSkillGaps)
      };
    } catch (error) {
      console.error('Error generating pathway:', error);
      throw new Error('Unable to generate learning pathway');
    }
  }

  private generateMilestones(skillName: string, totalHours: number): Milestone[] {
    // Generate context-aware milestones based on skill and estimated hours
    const baseMilestones = Math.max(2, Math.ceil(totalHours / 8)); // At least 2 milestones, roughly 1 per 8 hours
    
    const milestoneTemplates: Record<string, string[]> = {
      'AI Tools Proficiency': [
        'Complete introduction to AI concepts',
        'Practice with ChatGPT for work tasks',
        'Create AI-assisted project plan',
        'Integrate AI tools into daily workflow'
      ],
      'Prompt Engineering': [
        'Learn basic prompt structure',
        'Write effective prompts for different scenarios',
        'Develop project-specific prompt templates',
        'Master advanced prompting techniques'
      ],
      'Process Automation': [
        'Set up basic automation workflow',
        'Automate routine reporting tasks',
        'Create complex multi-step automations',
        'Implement error handling and monitoring'
      ],
      'Machine Learning Basics': [
        'Understand core ML concepts',
        'Practice with no-code ML tools',
        'Apply ML to business problems',
        'Evaluate and improve models'
      ],
      'Data Visualization with AI': [
        'Learn AI-powered visualization tools',
        'Create automated dashboard',
        'Build predictive visualizations',
        'Present insights to stakeholders'
      ]
    };

    const templates = milestoneTemplates[skillName] || [
      'Complete foundational learning',
      'Apply knowledge to real scenarios',
      'Build practical project',
      'Achieve proficiency level'
    ];

    return templates
      .slice(0, Math.min(baseMilestones, 4))
      .map((description, index) => ({
        id: `${skillName.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
        description,
        estimatedHours: Math.ceil(totalHours / Math.min(baseMilestones, 4))
      }));
  }

  private calculateEstimatedTime(skillGaps: SkillGap[]): string {
    const totalHours = skillGaps.reduce((sum, gap) => sum + gap.estimatedHours, 0);
    const weeks = Math.ceil(totalHours / 10); // Assuming 10 hours per week
    
    if (weeks <= 4) return `${weeks} weeks`;
    if (weeks <= 8) return `${Math.ceil(weeks / 4) * 4} weeks`;
    return `${Math.ceil(weeks / 4)} months`;
  }

  private generateEncouragement(currentSkills: string[], skillGaps: SkillGap[]): string {
    const strengths = currentSkills.length;
    const gaps = skillGaps.length;
    
    const encouragementMessages = [
      {
        condition: gaps === 0,
        message: `🎉 Amazing! You already have all the skills needed for this role. You're ready to make the transition!`
      },
      {
        condition: gaps === 1,
        message: `🎉 You're almost there! With your ${strengths} existing skills, you only need to develop ${gaps} more area to reach your goal.`
      },
      {
        condition: gaps === 2,
        message: `🚀 Great foundation! Your ${strengths} skills give you a strong starting point. Just ${gaps} more skills to master.`
      },
      {
        condition: gaps >= 3,
        message: `💪 Solid base to build from! Your ${strengths} existing skills show you're ready for this challenge. The ${gaps} new skills ahead are totally achievable.`
      }
    ];

    const applicableMessage = encouragementMessages.find(msg => msg.condition);
    return applicableMessage?.message || `🌟 Every expert was once a beginner. You've got this!`;
  }

  // Method to get available roles for exploration
  async getAvailableRoles(): Promise<string[]> {
    // Roles most impacted by AI displacement - focusing on transition opportunities
    return [
      'AI-Enhanced Customer Experience Specialist',
      'AI-Enhanced Administrative Coordinator', 
      'AI-Enhanced Financial Services Advisor',
      'AI-Enhanced Healthcare Information Manager',
      'AI-Enhanced Retail Operations Manager',
      'AI-Enhanced Human Resources Specialist',
      'AI-Enhanced Marketing Communications Manager',
      'AI-Enhanced Operations Analyst',
      'AI-Enhanced Quality Assurance Coordinator',
      'AI-Enhanced Business Intelligence Analyst',
      'AI-Enhanced Content Strategy Manager',
      'AI-Enhanced Sales Development Representative',
      'AI-Enhanced Process Improvement Specialist',
      'AI-Enhanced Training and Development Coordinator',
      'AI-Enhanced Compliance and Risk Analyst',
      'AI-Enhanced Event Coordination Manager',
      'AI-Enhanced Research and Insights Analyst',
      'AI-Enhanced Digital Marketing Specialist',
      'AI-Enhanced Supply Chain Coordinator',
      'AI-Enhanced Customer Success Manager'
    ];
  }

  // Method to get skill suggestions based on current skills
  async getSkillSuggestions(currentSkills: string[]): Promise<Alternative[]> {
    const suggestions: Alternative[] = [];
    
    // Simple rule-based suggestions for MVP
    if (currentSkills.includes('Project Management')) {
      suggestions.push({
        skill: 'AI Tools Proficiency',
        reason: 'Perfect complement to your project management skills',
        confidence: 0.9
      });
      suggestions.push({
        skill: 'Process Automation',
        reason: 'Automate repetitive project tasks',
        confidence: 0.8
      });
    }

    if (currentSkills.includes('Data Analysis')) {
      suggestions.push({
        skill: 'Machine Learning Basics',
        reason: 'Natural progression from data analysis',
        confidence: 0.9
      });
      suggestions.push({
        skill: 'Data Visualization with AI',
        reason: 'Enhance your analytical storytelling',
        confidence: 0.8
      });
    }

    // Always suggest AI Tools Proficiency if not present
    if (!currentSkills.includes('AI Tools Proficiency')) {
      suggestions.push({
        skill: 'AI Tools Proficiency',
        reason: 'Essential skill for any AI-enhanced role',
        confidence: 0.95
      });
    }

    return suggestions.slice(0, 3);
  }
}