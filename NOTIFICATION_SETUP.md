# Login Notification Setup Guide

This guide explains how to set up SMS and WhatsApp notifications for login alerts in the MIS system.

## Overview

When a user logs into the system, an automatic notification will be sent to **+92 346 9750336** via WhatsApp or SMS, informing them of the login activity.

## Prerequisites

1. **Twilio Account**: You need a Twilio account to send SMS and WhatsApp messages
   - Sign up at: https://www.twilio.com/try-twilio
   - Get your Account SID and Auth Token from the Twilio Console

2. **Phone Numbers**:
   - For SMS: Purchase a Twilio phone number (can be any number from Twilio)
   - For WhatsApp: Use Twilio's WhatsApp Sandbox or apply for WhatsApp Business API

## Setup Instructions

### Step 1: Install Dependencies

The Twilio package should be installed automatically, but if needed:

```bash
npm install twilio
```

### Step 2: Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number for SMS
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Twilio WhatsApp number
```

**Important**: Never commit your `.env.local` file to version control!

### Step 3: Get Twilio Credentials

1. **Account SID and Auth Token**:
   - Go to https://console.twilio.com/
   - Find your Account SID and Auth Token on the dashboard
   - Copy these values to your `.env.local` file

2. **SMS Phone Number**:
   - In Twilio Console, go to: Phone Numbers > Manage > Active Numbers
   - If you don't have a number, buy one: Phone Numbers > Buy a Number
   - Copy the number in E.164 format (e.g., +15551234567)

3. **WhatsApp Setup (Optional but Recommended)**:
   
   **Option A: WhatsApp Sandbox (for testing)**
   - Go to: Messaging > Try it Out > Send a WhatsApp Message
   - Follow instructions to join your sandbox (send a code to a WhatsApp number)
   - Use the sandbox number as `TWILIO_WHATSAPP_NUMBER`
   
   **Option B: WhatsApp Business API (for production)**
   - Apply for WhatsApp Business API: https://www.twilio.com/whatsapp/request-access
   - Complete the verification process
   - Get your approved WhatsApp-enabled number

### Step 4: Test the Setup

1. Make sure your environment variables are set correctly
2. Restart your development server:
   ```bash
   npm run dev
   ```
3. Try logging into the system
4. Check if you receive a notification at +923469750336

## Notification Format

The notification message will look like this:

```
🔐 MIS System Login Alert

User: John Doe
User ID: john.doe
Time: Dec 17, 2024, 2:30 PM

You have successfully logged into the MIS system.
```

## How It Works

1. User enters credentials and submits the login form
2. API validates the credentials
3. If login is successful, the system sends a notification in the background
4. Notification tries WhatsApp first (if configured), then falls back to SMS
5. User is redirected to the dashboard
6. Notification is delivered within seconds

## Notification Priority

The system follows this priority:
1. **WhatsApp** (if `TWILIO_WHATSAPP_NUMBER` is configured)
2. **SMS** (if WhatsApp fails or `TWILIO_PHONE_NUMBER` is configured)

## Troubleshooting

### Notification not received

1. **Check environment variables**: Make sure all Twilio credentials are correctly set
2. **Check Twilio Console logs**: Go to Monitor > Logs > Messaging to see delivery status
3. **Verify phone number**: Ensure +923469750336 can receive messages
4. **WhatsApp Sandbox**: Make sure the recipient has joined the Twilio WhatsApp sandbox (if using sandbox)
5. **Check server logs**: Look for any error messages in your application logs

### WhatsApp Not Working

1. Verify the recipient has joined your WhatsApp sandbox (for testing)
2. Check that you're using the correct WhatsApp number format: `whatsapp:+14155238886`
3. Ensure you've completed WhatsApp Business API approval (for production)

### SMS Not Working

1. Verify your Twilio phone number is SMS-enabled
2. Check that you have sufficient Twilio balance
3. Verify the recipient number is in correct E.164 format (+923469750336)

## Cost Considerations

- **SMS**: Varies by country (Pakistan: ~$0.05 per message)
- **WhatsApp**: Generally cheaper than SMS (~$0.005-$0.01 per message)
- **Twilio Trial**: $15 free credit when you sign up

## Customization

To change the notification phone number, edit the `notificationNumber` variable in:
`src/lib/notification-service.ts`

```typescript
const notificationNumber = '+923469750336'; // Change this number
```

## Security Notes

1. Never expose Twilio credentials in client-side code
2. All notifications are sent server-side only
3. Login notifications do not affect login success (they run in the background)
4. Failed notifications are logged but don't break the login flow

## Support

For Twilio support: https://support.twilio.com/
For MIS system support: Contact your system administrator
