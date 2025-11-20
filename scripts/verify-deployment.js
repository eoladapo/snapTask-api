/**
 * Deployment Verification Script
 * 
 * This script verifies that all required environment variables are set
 * and that the application can connect to required services.
 * 
 * Run before deployment: node scripts/verify-deployment.js
 */

require('dotenv').config();

const requiredEnvVars = [
  'MONGODB_URI',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'GEMINI_API_KEY',
  'PHONE_ENCRYPTION_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER'
];

const optionalEnvVars = [
  'PORT',
  'ACCESS_TOKEN_EXPIRES',
  'REFRESH_TOKEN_EXPIRES',
  'GEMINI_MODEL',
  'MAX_NOTIFICATIONS_PER_DAY',
  'NOTIFICATION_RETRY_ATTEMPTS',
  'NODE_ENV'
];

console.log('🔍 SnapTask Deployment Verification\n');
console.log('=' .repeat(50));

let hasErrors = false;
let hasWarnings = false;

// Check required environment variables
console.log('\n📋 Checking Required Environment Variables...\n');

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const maskedValue = value.length > 10 
      ? value.substring(0, 10) + '...' 
      : '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

// Check optional environment variables
console.log('\n📋 Checking Optional Environment Variables...\n');

optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: Not set (using default)`);
    hasWarnings = true;
  } else {
    console.log(`✅ ${varName}: ${value}`);
  }
});

// Validate specific values
console.log('\n🔐 Validating Configuration...\n');

// Check encryption key length
if (process.env.PHONE_ENCRYPTION_KEY) {
  const keyLength = process.env.PHONE_ENCRYPTION_KEY.length;
  if (keyLength !== 32) {
    console.log(`❌ PHONE_ENCRYPTION_KEY: Must be exactly 32 characters (current: ${keyLength})`);
    hasErrors = true;
  } else {
    console.log('✅ PHONE_ENCRYPTION_KEY: Correct length (32 characters)');
  }
}

// Check JWT secrets are different
if (process.env.ACCESS_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET) {
  if (process.env.ACCESS_TOKEN_SECRET === process.env.REFRESH_TOKEN_SECRET) {
    console.log('❌ JWT Secrets: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different');
    hasErrors = true;
  } else {
    console.log('✅ JWT Secrets: Different secrets used');
  }
}

// Check JWT secrets are strong
if (process.env.ACCESS_TOKEN_SECRET) {
  if (process.env.ACCESS_TOKEN_SECRET.length < 32) {
    console.log('⚠️  ACCESS_TOKEN_SECRET: Should be at least 32 characters for security');
    hasWarnings = true;
  } else {
    console.log('✅ ACCESS_TOKEN_SECRET: Strong secret');
  }
}

if (process.env.REFRESH_TOKEN_SECRET) {
  if (process.env.REFRESH_TOKEN_SECRET.length < 32) {
    console.log('⚠️  REFRESH_TOKEN_SECRET: Should be at least 32 characters for security');
    hasWarnings = true;
  } else {
    console.log('✅ REFRESH_TOKEN_SECRET: Strong secret');
  }
}

// Check WhatsApp number format
if (process.env.TWILIO_WHATSAPP_NUMBER) {
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!whatsappNumber.startsWith('whatsapp:+')) {
    console.log('❌ TWILIO_WHATSAPP_NUMBER: Must start with "whatsapp:+" (e.g., whatsapp:+14155238886)');
    hasErrors = true;
  } else {
    console.log('✅ TWILIO_WHATSAPP_NUMBER: Correct format');
  }
}

// Check MongoDB URI format
if (process.env.MONGODB_URI) {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.log('❌ MONGODB_URI: Must start with "mongodb://" or "mongodb+srv://"');
    hasErrors = true;
  } else {
    console.log('✅ MONGODB_URI: Correct format');
  }
}

// Check Gemini API key format
if (process.env.GEMINI_API_KEY) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey.startsWith('AIzaSy')) {
    console.log('⚠️  GEMINI_API_KEY: Should start with "AIzaSy" (verify this is correct)');
    hasWarnings = true;
  } else {
    console.log('✅ GEMINI_API_KEY: Correct format');
  }
}

// Check Twilio Account SID format
if (process.env.TWILIO_ACCOUNT_SID) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  if (!twilioSid.startsWith('AC')) {
    console.log('⚠️  TWILIO_ACCOUNT_SID: Should start with "AC" (verify this is correct)');
    hasWarnings = true;
  } else {
    console.log('✅ TWILIO_ACCOUNT_SID: Correct format');
  }
}

// Check production environment
console.log('\n🌍 Environment Check...\n');

const nodeEnv = process.env.NODE_ENV || 'development';
console.log(`Environment: ${nodeEnv}`);

if (nodeEnv === 'production') {
  console.log('✅ Running in production mode');
  
  // Additional production checks
  if (process.env.ACCESS_TOKEN_SECRET === 'dev-secret-change-in-production') {
    console.log('❌ SECURITY: Still using development JWT secret in production!');
    hasErrors = true;
  }
  
  if (process.env.PHONE_ENCRYPTION_KEY === 'dev12345678901234567890123456') {
    console.log('❌ SECURITY: Still using development encryption key in production!');
    hasErrors = true;
  }
  
  if (process.env.TWILIO_WHATSAPP_NUMBER === 'whatsapp:+14155238886') {
    console.log('⚠️  Using Twilio sandbox number in production (consider getting approved number)');
    hasWarnings = true;
  }
} else {
  console.log('⚠️  Not running in production mode');
  hasWarnings = true;
}

// Test MongoDB connection
console.log('\n🗄️  Testing Database Connection...\n');

async function testMongoConnection() {
  try {
    const mongoose = require('mongoose');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ MongoDB: Connection successful');
    await mongoose.connection.close();
    return true;
  } catch (error) {
    console.log('❌ MongoDB: Connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test Twilio connection
console.log('\n📱 Testing Twilio Connection...\n');

async function testTwilioConnection() {
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Just verify credentials by fetching account info
    await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    console.log('✅ Twilio: Authentication successful');
    return true;
  } catch (error) {
    console.log('❌ Twilio: Authentication failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test Gemini API
console.log('\n🤖 Testing Gemini API...\n');

async function testGeminiConnection() {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    
    // Simple test prompt
    const result = await model.generateContent('Say "OK" if you can read this.');
    const response = await result.response;
    const text = response.text();
    
    if (text) {
      console.log('✅ Gemini API: Connection successful');
      return true;
    } else {
      console.log('⚠️  Gemini API: Connected but no response');
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API: Connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  const mongoOk = await testMongoConnection();
  const twilioOk = await testTwilioConnection();
  const geminiOk = await testGeminiConnection();
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Verification Summary\n');
  
  if (hasErrors) {
    console.log('❌ ERRORS FOUND: Fix these before deploying');
  } else {
    console.log('✅ No critical errors found');
  }
  
  if (hasWarnings) {
    console.log('⚠️  WARNINGS: Review these before deploying');
  } else {
    console.log('✅ No warnings');
  }
  
  console.log('\nService Connections:');
  console.log(`  MongoDB: ${mongoOk ? '✅' : '❌'}`);
  console.log(`  Twilio: ${twilioOk ? '✅' : '❌'}`);
  console.log(`  Gemini: ${geminiOk ? '✅' : '❌'}`);
  
  const allOk = !hasErrors && mongoOk && twilioOk && geminiOk;
  
  console.log('\n' + '='.repeat(50));
  
  if (allOk) {
    console.log('\n✅ READY FOR DEPLOYMENT\n');
    process.exit(0);
  } else {
    console.log('\n❌ NOT READY FOR DEPLOYMENT - Fix issues above\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Verification script failed:', error);
  process.exit(1);
});
