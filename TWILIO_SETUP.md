# Twilio SMS/WhatsApp Notification Setup

## Overview
The MIS system is already configured to send login notifications to **+923469750336** via SMS or WhatsApp when any user logs in.

## Current Implementation
✅ Notification service is implemented (`src/lib/notification-service.ts`)
✅ Login route is configured to send notifications (`src/app/api/login/route.ts`)
✅ Phone number is set to: +923469750336

## Setup Instructions

### Step 1: Create a Twilio Account
1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your phone number

### Step 2: Get Your Twilio Credentials
1. Log in to [Twilio Console](https://console.twilio.com/)
2. From the dashboard, copy:
   - **Account SID**
   - **Auth Token**
3. Get a phone number:
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Or use the free trial number provided

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory with:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Optional: For WhatsApp (requires WhatsApp sandbox setup)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 4: SMS Setup (Easiest Option)
For SMS notifications:
1. Use the credentials from Step 2
2. Make sure `TWILIO_PHONE_NUMBER` is set to your Twilio phone number
3. That's it! SMS notifications will work immediately

### Step 5: WhatsApp Setup (Optional)
For WhatsApp notifications:
1. Go to Twilio Console → **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow the sandbox setup instructions:
   - Send a specific code to the Twilio WhatsApp number
   - Format: `join [your-sandbox-code]`
3. Add `TWILIO_WHATSAPP_NUMBER` to your `.env` file
4. The system will try WhatsApp first, then fallback to SMS if WhatsApp fails

## How It Works
1. When a user logs in successfully
2. The system sends a notification in the background (non-blocking)
3. Message format:
   ```
   🔐 MIS System Login Alert

   User: [Full Name]
   User ID: [User ID]
   Time: [Login Time in PKT]

   You have successfully logged into the MIS system.
   ```
4. The notification is sent to: **+923469750336**

## Notification Behavior
- ✅ Notifications are sent in the background (login doesn't wait for SMS/WhatsApp)
- ✅ If notification fails, login still succeeds
- ✅ WhatsApp is tried first (if configured), then falls back to SMS
- ✅ Errors are logged but don't affect user login

## Testing
1. Set up your Twilio credentials in `.env`
2. Restart your Next.js server
3. Try logging in with any user account
4. Check if you receive the notification on +923469750336

## Changing the Notification Number
To change the phone number that receives notifications, edit:
`src/lib/notification-service.ts` line 41:
```typescript
const notificationNumber = '+923469750336'; // Change this number
```

## Troubleshooting

### No notifications received?
1. Check if `.env` file exists and has correct credentials
2. Check server logs for errors
3. Verify Twilio phone number is verified for trial accounts
4. For trial accounts, verify the recipient number in Twilio Console

### Trial Account Limitations
- Trial accounts can only send to verified numbers
- Add +923469750336 to verified numbers in Twilio Console
- Or upgrade to a paid account for unrestricted sending

## Cost
- **Trial**: Free credits (limited messages)
- **SMS**: ~$0.0075 per message to Pakistan
- **WhatsApp**: ~$0.005 per message

## Support
For Twilio support, visit: [https://support.twilio.com/](https://support.twilio.com/)
