const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

export interface PIIItem {
  type: 'email' | 'phone' | 'ssn' | 'address' | 'name';
  original: string;
  redacted: string;
  position?: number;
}

export interface ExtractedSkill {
  name: string;
  confidence: number;
  type: 'technical' | 'soft' | 'domain';
  category?: string;
}

export interface ResumeParseResult {
  originalText: string;
  redactedText: string;
  piiItems: PIIItem[];
  skills: ExtractedSkill[];
  metadata: {
    fileName: string;
    fileType: string;
    textLength: number;
    processingTime: number;
  };
}

export class ResumeParser {
  private readonly skillPatterns = [
    // Technical Skills
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'Django', 'Flask', 'Spring', '.NET', 'SQL', 'NoSQL',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS',
    'Azure', 'GCP', 'Git', 'CI/CD', 'Jenkins', 'REST API', 'GraphQL',
    
    // AI/ML Skills
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow',
    'PyTorch', 'Scikit-learn', 'Data Science', 'Data Analysis', 'Statistics',
    
    // Business Tools
    'Salesforce', 'ServiceNow', 'SAP', 'Oracle', 'Workday', 'HubSpot',
    'Microsoft Office', 'Excel', 'PowerPoint', 'Tableau', 'Power BI',
    'Google Analytics', 'Jira', 'Confluence', 'Monday.com', 'Asana',
    
    // Soft Skills
    'Project Management', 'Team Leadership', 'Communication', 'Problem Solving',
    'Critical Thinking', 'Collaboration', 'Time Management', 'Customer Service',
    'Sales', 'Marketing', 'Business Development', 'Strategic Planning'
  ];

  async parseFile(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docxResult = await mammoth.extractRawText({ buffer });
        return docxResult.value;
      
      case 'text/plain':
        return buffer.toString('utf-8');
      
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  redactPII(text: string): { redactedText: string; piiItems: PIIItem[] } {
    let redactedText = text;
    const piiItems: PIIItem[] = [];
    
    // Email redaction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    redactedText = redactedText.replace(emailRegex, (match, offset) => {
      piiItems.push({
        type: 'email',
        original: match,
        redacted: '[EMAIL_REDACTED]',
        position: offset
      });
      return '[EMAIL_REDACTED]';
    });
    
    // Phone redaction (US format)
    const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    redactedText = redactedText.replace(phoneRegex, (match, offset) => {
      piiItems.push({
        type: 'phone',
        original: match,
        redacted: '[PHONE_REDACTED]',
        position: offset
      });
      return '[PHONE_REDACTED]';
    });
    
    // SSN redaction
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    redactedText = redactedText.replace(ssnRegex, (match, offset) => {
      piiItems.push({
        type: 'ssn',
        original: match,
        redacted: '[SSN_REDACTED]',
        position: offset
      });
      return '[SSN_REDACTED]';
    });
    
    // Basic address redaction (street addresses)
    const addressRegex = /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl|way)\b/gi;
    redactedText = redactedText.replace(addressRegex, (match, offset) => {
      piiItems.push({
        type: 'address',
        original: match,
        redacted: '[ADDRESS_REDACTED]',
        position: offset
      });
      return '[ADDRESS_REDACTED]';
    });
    
    return { redactedText, piiItems };
  }

  extractSkills(text: string): ExtractedSkill[] {
    const skills: ExtractedSkill[] = [];
    const lowerText = text.toLowerCase();
    const foundSkills = new Set<string>();
    
    this.skillPatterns.forEach(skill => {
      const skillLower = skill.toLowerCase();
      if (lowerText.includes(skillLower) && !foundSkills.has(skillLower)) {
        foundSkills.add(skillLower);
        
        // Determine skill type
        let type: 'technical' | 'soft' | 'domain' = 'domain';
        if (['communication', 'leadership', 'management', 'collaboration', 'problem solving'].some(s => skillLower.includes(s))) {
          type = 'soft';
        } else if (['javascript', 'python', 'java', 'react', 'docker', 'aws', 'machine learning'].some(s => skillLower.includes(s))) {
          type = 'technical';
        }
        
        // Calculate confidence based on context
        const confidence = this.calculateSkillConfidence(text, skill);
        
        skills.push({
          name: skill,
          confidence,
          type,
          category: this.getSkillCategory(skill)
        });
      }
    });
    
    // Sort by confidence
    return skills.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateSkillConfidence(text: string, skill: string): number {
    const lowerText = text.toLowerCase();
    const skillLower = skill.toLowerCase();
    
    // Base confidence
    let confidence = 0.7;
    
    // Boost if mentioned multiple times
    const occurrences = (lowerText.match(new RegExp(skillLower, 'g')) || []).length;
    if (occurrences > 1) confidence += 0.1;
    if (occurrences > 3) confidence += 0.1;
    
    // Boost if in experience/skills section
    const skillSectionRegex = /(skills|technical|expertise|proficient|experienced)/i;
    const nearSkillSection = lowerText.indexOf(skillLower);
    const sectionMatch = skillSectionRegex.exec(lowerText.substring(Math.max(0, nearSkillSection - 100), nearSkillSection));
    if (sectionMatch) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private getSkillCategory(skill: string): string {
    const categories: Record<string, string[]> = {
      'Programming': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#'],
      'Frontend': ['React', 'Angular', 'Vue', 'HTML', 'CSS'],
      'Backend': ['Node.js', 'Express', 'Django', 'Flask', 'Spring', '.NET'],
      'Database': ['SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
      'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD'],
      'AI/ML': ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch'],
      'Business Tools': ['Salesforce', 'ServiceNow', 'SAP', 'Microsoft Office'],
      'Analytics': ['Tableau', 'Power BI', 'Google Analytics', 'Data Analysis'],
      'Management': ['Project Management', 'Team Leadership', 'Strategic Planning'],
      'Communication': ['Communication', 'Customer Service', 'Sales', 'Marketing']
    };
    
    for (const [category, skills] of Object.entries(categories)) {
      if (skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
        return category;
      }
    }
    
    return 'General';
  }

  async parseResume(buffer: Buffer, fileName: string, mimeType: string): Promise<ResumeParseResult> {
    const startTime = Date.now();
    
    // Extract text from file
    const originalText = await this.parseFile(buffer, mimeType);
    
    // Redact PII
    const { redactedText, piiItems } = this.redactPII(originalText);
    
    // Extract skills
    const skills = this.extractSkills(redactedText);
    
    const processingTime = Date.now() - startTime;
    
    return {
      originalText,
      redactedText,
      piiItems,
      skills,
      metadata: {
        fileName,
        fileType: mimeType,
        textLength: originalText.length,
        processingTime
      }
    };
  }
}