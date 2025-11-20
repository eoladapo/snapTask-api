/**
 * Twilio Setup Verification Script
 * 
 * This script verifies that your Twilio credentials are correctly configured
 * and can connect to the Twilio API.
 * 
 * Usage: node scripts/verify-twilio-setup.js
 */

require('dotenv').config();

// Check if required environment variables are set
function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');
  
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_NUMBER'
  ];
  
  const missing = [];
  const placeholder = [];
  
  required.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      missing.push(varName);
      console.log(`❌ ${varName}: Not set`);
    } else if (value.includes('your_') || value.includes('here')) {
      placeholder.push(varName);
      console.log(`⚠️  ${varName}: Still using placeholder value`);
    } else {
      console.log(`✅ ${varName}: Set`);
    }
  });
  
  console.log('');
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(v => console.log(`   - ${v}`));
    console.log('\nPlease add these to your .env file.');
    return false;
  }
  
  if (placeholder.length > 0) {
    console.log('⚠️  Some variables are still using placeholder values:');
    placeholder.forEach(v => console.log(`   - ${v}`));
    console.log('\nPlease update these with your actual Twilio credentials.');
    console.log('See TWILIO_SETUP_GUIDE.md for instructions.');
    return false;
  }
  
  return true;
}

// Validate credential format
function validateCredentials() {
  console.log('🔍 Validating credential format...\n');
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  
  let valid = true;
  
  // Account SID should start with AC and be 34 characters
  if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
    console.log('❌ TWILIO_ACCOUNT_SID format appears invalid');
    console.log('   Expected: AC followed by 32 characters');
    console.log(`   Got: ${accountSid.substring(0, 10)}...`);
    valid = false;
  } else {
    console.log('✅ TWILIO_ACCOUNT_SID format looks correct');
  }
  
  // Auth Token should be 32 characters
  if (authToken.length !== 32) {
    console.log('❌ TWILIO_AUTH_TOKEN length appears invalid');
    console.log('   Expected: 32 characters');
    console.log(`   Got: ${authToken.length} characters`);
    valid = false;
  } else {
    console.log('✅ TWILIO_AUTH_TOKEN length looks correct');
  }
  
  // WhatsApp number should start with whatsapp:+
  if (!whatsappNumber.startsWith('whatsapp:+')) {
    console.log('❌ TWILIO_WHATSAPP_NUMBER format appears invalid');
    console.log('   Expected: whatsapp:+1234567890');
    console.log(`   Got: ${whatsappNumber}`);
    valid = false;
  } else {
    console.log('✅ TWILIO_WHATSAPP_NUMBER format looks correct');
  }
  
  console.log('');
  return valid;
}

// Test Twilio API connection (requires twilio package)
async function testTwilioConnection() {
  console.log('🔍 Testing Twilio API connection...\n');
  
  try {
    // Try to require twilio package
    const twilio = require('twilio');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    const client = twilio(accountSid, authToken);
    
    // Fetch account details to verify credentials
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Successfully connected to Twilio API');
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Account Type: ${account.type}`);
    console.log('');
    
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Twilio SDK not installed yet');
      console.log('   This is expected if you haven\'t run Task 23 yet');
      console.log('   Install with: npm install twilio');
      console.log('');
      return null; // Not an error, just not installed yet
    }
    
    console.log('❌ Failed to connect to Twilio API');
    console.log(`   Error: ${error.message}`);
    
    if (error.status === 401) {
      console.log('   This usually means your credentials are incorrect.');
      console.log('   Please verify your Account SID and Auth Token.');
    }
    
    console.log('');
    return false;
  }
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Twilio WhatsApp Setup Verification');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Step 1: Check environment variables
  const envCheck = checkEnvironmentVariables();
  if (!envCheck) {
    console.log('❌ Setup incomplete. Please configure your environment variables.\n');
    process.exit(1);
  }
  
  // Step 2: Validate credential format
  const formatCheck = validateCredentials();
  if (!formatCheck) {
    console.log('⚠️  Some credentials may be incorrectly formatted.\n');
    console.log('If you\'re sure they\'re correct, you can ignore this warning.\n');
  }
  
  // Step 3: Test API connection
  const connectionCheck = await testTwilioConnection();
  
  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (connectionCheck === true) {
    console.log('✅ All checks passed! Your Twilio setup is ready.');
    console.log('   You can proceed to Task 23: Create WhatsApp Service\n');
  } else if (connectionCheck === null) {
    console.log('✅ Environment variables are configured correctly.');
    console.log('⚠️  Twilio SDK not installed yet (expected).');
    console.log('   Install it when implementing Task 23.\n');
  } else {
    console.log('❌ Setup verification failed.');
    console.log('   Please review the errors above and fix them.\n');
    console.log('📖 See TWILIO_SETUP_GUIDE.md for detailed instructions.\n');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
