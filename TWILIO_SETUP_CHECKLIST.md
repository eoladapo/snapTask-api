# Twilio Setup Checklist

Use this checklist to track your progress setting up Twilio for WhatsApp notifications.

## ☐ Step 1: Create Twilio Account
- [ ] Go to https://www.twilio.com/try-twilio
- [ ] Sign up for free trial account
- [ ] Verify email address
- [ ] Verify phone number
- [ ] Confirm you received $15 trial credits

## ☐ Step 2: Get Account Credentials
- [ ] Log in to Twilio Console (https://console.twilio.com/)
- [ ] Copy Account SID from dashboard
- [ ] Copy Auth Token from dashboard
- [ ] Save credentials securely (password manager recommended)

## ☐ Step 3: Enable WhatsApp Sandbox
- [ ] Navigate to Messaging → Try it out → Send a WhatsApp message
- [ ] Note the sandbox number (usually +1 415 523 8886)
- [ ] Note the join code shown in the console
- [ ] Open WhatsApp on your phone
- [ ] Send the join message to the sandbox number
- [ ] Receive confirmation message in WhatsApp
- [ ] Test by sending a message from Twilio Console

## ☐ Step 4: Configure Environment Variables
- [ ] Open `backend/.env` file
- [ ] Replace `your_twilio_account_sid_here` with your actual Account SID
- [ ] Replace `your_twilio_auth_token_here` with your actual Auth Token
- [ ] Verify `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886` (or your sandbox number)
- [ ] Save the file
- [ ] **DO NOT commit this file to Git** (already in .gitignore)

## ☐ Step 5: Production Setup (Optional - Can be done later)
- [ ] Create Facebook Business Manager account
- [ ] Prepare business information (name, description, website, category)
- [ ] In Twilio Console, go to Messaging → Senders → WhatsApp senders
- [ ] Click "New WhatsApp Sender"
- [ ] Fill out business profile form
- [ ] Submit for Meta review
- [ ] Wait for approval email (1-3 business days)
- [ ] Update `TWILIO_WHATSAPP_NUMBER` in `.env` with approved number

## ☐ Step 6: Verify Setup
- [ ] Confirm all environment variables are set in `.env`
- [ ] Restart backend server to load new environment variables
- [ ] Ready to proceed to Task 23 (Create WhatsApp Service)

---

## Current Status

**Date Started:** _________________

**Completed Steps:** _____ / 6

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

## Quick Reference

**Twilio Console:** https://console.twilio.com/
**Account SID:** AC________________________________
**Sandbox Number:** whatsapp:+14155238886
**Your WhatsApp Number:** +_____________________

---

**⚠️ Security Reminder:**
- Never share your Auth Token
- Never commit `.env` file to version control
- Use environment variables in production hosting
