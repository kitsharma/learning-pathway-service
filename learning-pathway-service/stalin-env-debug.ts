import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔴 STALIN\'S ENVIRONMENT VARIABLE INVESTIGATION');
console.log('='.repeat(50));

console.log('TESTING ENVIRONMENT VARIABLES:');
console.log(`NODE_ENV: "${process.env.NODE_ENV}"`);
console.log(`XAI_API_KEY: "${process.env.XAI_API_KEY}"`);
console.log(`X_AI_API_BASE: "${process.env.X_AI_API_BASE}"`);
console.log(`PERPLEXITY_API_KEY: "${process.env.PERPLEXITY_API_KEY}"`);

console.log('\nTESTING ENHANCED RESOURCE FETCHER:');
import { EnhancedResourceFetcher } from './src/services/enhanced-resource-fetcher';

const fetcher = new EnhancedResourceFetcher();

// Check if the fetcher can access the API key
const fetcherTest = (fetcher as any);
console.log(`Fetcher xaiApiKey: "${fetcherTest.xaiApiKey}"`);
console.log(`Fetcher xaiApiBase: "${fetcherTest.xaiApiBase}"`);

console.log('\n🔴 STALIN ANALYSIS:');
if (process.env.XAI_API_KEY) {
  console.log('✅ Environment variable XAI_API_KEY exists');
} else {
  console.log('❌ Environment variable XAI_API_KEY is missing!');
}

if (fetcherTest.xaiApiKey) {
  console.log('✅ EnhancedResourceFetcher has API key');
} else {
  console.log('❌ EnhancedResourceFetcher API key is empty!');
}

const keyCheck = !fetcherTest.xaiApiKey || fetcherTest.xaiApiKey === 'xai-your-api-key-here';
console.log(`Key check condition result: ${keyCheck}`);

console.log('\n🔴 STALIN VERDICT:');
if (process.env.XAI_API_KEY && !fetcherTest.xaiApiKey) {
  console.log('🚨 ENVIRONMENT LOADING BUG - API key exists but not reaching class!');
} else if (!process.env.XAI_API_KEY) {
  console.log('🚨 ENVIRONMENT FILE NOT LOADED - .env file issue!');
} else {
  console.log('✅ Environment variables working correctly!');
}