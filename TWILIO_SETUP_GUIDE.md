# Twilio WhatsApp Setup Guide

This guide will walk you through setting up Twilio for WhatsApp notifications in SnapTask.

## Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email address and phone number
4. You'll receive **$15 in free trial credits**

## Step 2: Get Your Account Credentials

1. After logging in, go to your [Twilio Console Dashboard](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** in the "Account Info" section
3. Copy these values - you'll need them for the `.env` file

## Step 3: Enable WhatsApp Sandbox (For Testing)

The WhatsApp Sandbox allows you to test WhatsApp messaging without waiting for production approval.

1. In the Twilio Console, navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. You'll see a sandbox number (usually `+1 415 523 8886`)
3. Follow the instructions to connect your personal WhatsApp:
   - Send a message with the code shown (e.g., "join <your-code>") to the sandbox number
   - You should receive a confirmation message
4. Your WhatsApp number is now connected to the sandbox for testing

**Sandbox Limitations:**
- Only works with pre-approved phone numbers (numbers that have joined the sandbox)
- Messages expire after 24 hours of inactivity
- Not suitable for production use

## Step 4: Configure Environment Variables

Update your `backend/.env` file with your Twilio credentials:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Notification Settings
MAX_NOTIFICATIONS_PER_DAY=10
NOTIFICATION_RETRY_ATTEMPTS=3
```

**For Sandbox Testing:**
- Use `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886` (or your sandbox number)

**For Production:**
- Use your approved WhatsApp Business number (see Step 5)

## Step 5: Get Production WhatsApp Number Approval (Optional - For Production)

To send WhatsApp messages to any user (not just sandbox participants), you need an approved WhatsApp Business number.

### Requirements:
1. **Facebook Business Manager Account**
   - Create at [https://business.facebook.com](https://business.facebook.com)
   
2. **WhatsApp Business Profile**
   - Business name
   - Business description
   - Business website
   - Business category

3. **Phone Number**
   - Must be able to receive SMS/voice calls
   - Cannot be already registered with WhatsApp
   - Recommended: Get a dedicated number from Twilio

### Approval Process:

1. In Twilio Console, go to **Messaging** → **Senders** → **WhatsApp senders**
2. Click **New WhatsApp Sender**
3. Choose **Request to enable my Twilio number for WhatsApp**
4. Fill out the business profile information:
   - Business display name
   - Business description
   - Business website
   - Business vertical (category)
   - Business address
5. Submit for review

**Approval Timeline:**
- Usually takes 1-3 business days
- Meta (Facebook) reviews your business profile
- You'll receive an email when approved

**After Approval:**
- Update `TWILIO_WHATSAPP_NUMBER` in `.env` with your approved number
- Format: `whatsapp:+1234567890`

## Step 6: Install Twilio SDK

The Twilio SDK will be installed when you implement the WhatsApp service (Task 23).

```bash
npm install twilio
```

## Step 7: Test Your Setup

Once you've configured the environment variables, you can test the connection:

1. Implement the WhatsApp service (Task 23)
2. Use the test notification endpoint to send a test message
3. Verify you receive the message on WhatsApp

## Pricing Information

### Trial Account:
- $15 in free credits
- Can send messages to verified numbers only
- Sandbox is completely free

### Production Pricing (as of 2024):
- **WhatsApp messages**: ~$0.005 - $0.01 per message (varies by country)
- **Phone number**: ~$1-2/month for a Twilio number
- **No monthly minimums** - pay only for what you use

### Cost Estimation for SnapTask:
- 100 users × 5 notifications/day = 500 messages/day
- 500 × $0.01 = $5/day = ~$150/month
- With rate limiting (10 messages/user/day max), costs are predictable

## Troubleshooting

### "Unable to create record: The 'To' number is not a valid phone number"
- Ensure phone numbers are in E.164 format: `+[country code][number]`
- Example: `+14155551234`

### "Permission to send an SMS has not been enabled"
- Your trial account can only send to verified numbers
- Verify the recipient's number in Twilio Console → Phone Numbers → Verified Caller IDs

### "Sandbox has expired"
- Sandbox connections expire after 24 hours of inactivity
- Re-send the join code to reconnect

### "Authentication Error"
- Double-check your Account SID and Auth Token
- Ensure no extra spaces in `.env` file

## Security Best Practices

1. **Never commit `.env` file to version control**
   - Already in `.gitignore`
   
2. **Use environment variables in production**
   - Set these in your hosting platform (Render, Heroku, etc.)
   
3. **Rotate credentials regularly**
   - Generate new Auth Tokens periodically
   
4. **Monitor usage**
   - Set up usage alerts in Twilio Console
   - Prevent unexpected charges

## Next Steps

After completing this setup:
1. ✅ Twilio account created
2. ✅ Credentials added to `.env`
3. ✅ WhatsApp sandbox enabled and tested
4. ⏭️ Proceed to Task 23: Create WhatsApp Service
5. ⏭️ Implement notification scheduling (Tasks 24-26)

## Resources

- [Twilio WhatsApp API Documentation](https://www.twilio.com/docs/whatsapp)
- [WhatsApp Business API Pricing](https://www.twilio.com/whatsapp/pricing)
- [Twilio Node.js SDK Documentation](https://www.twilio.com/docs/libraries/node)
- [WhatsApp Message Templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)

---

**Note**: For MVP/testing purposes, the WhatsApp Sandbox is sufficient. You can defer production approval until you've validated the feature with real users.
