import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

interface NotificationOptions {
	to: string;
	message: string;
	type: 'sms' | 'whatsapp';
}

export async function sendLoginNotification(
	userName: string,
	userId: string,
	timestamp: Date = new Date()
): Promise<{ success: boolean; message: string }> {
	try {
		// Check if Twilio credentials are configured
		if (!accountSid || !authToken) {
			console.warn('Twilio credentials not configured. Skipping notification.');
			return {
				success: false,
				message: 'Notification service not configured'
			};
		}

		const client = twilio(accountSid, authToken);
		
		// Format the notification message
		const formattedTime = timestamp.toLocaleString('en-US', {
			timeZone: 'Asia/Karachi',
			dateStyle: 'medium',
			timeStyle: 'short'
		});
		
		const message = `🔐 MIS System Login Alert\n\nUser: ${userName}\nUser ID: ${userId}\nTime: ${formattedTime}\n\nYou have successfully logged into the MIS system.`;

		const notificationNumber = '+923469750336'; // Target number
		
		// Try WhatsApp first if configured, fallback to SMS
		let notificationSent = false;
		let lastError = '';

		// Attempt WhatsApp notification
		if (twilioWhatsAppNumber) {
			try {
				await client.messages.create({
					body: message,
					from: twilioWhatsAppNumber,
					to: `whatsapp:${notificationNumber}`
				});
				notificationSent = true;
				console.log('WhatsApp notification sent successfully');
			} catch (whatsappError) {
				console.error('WhatsApp notification failed:', whatsappError);
				lastError = whatsappError instanceof Error ? whatsappError.message : 'WhatsApp failed';
			}
		}

		// Fallback to SMS if WhatsApp failed or not configured
		if (!notificationSent && twilioPhoneNumber) {
			try {
				await client.messages.create({
					body: message,
					from: twilioPhoneNumber,
					to: notificationNumber
				});
				notificationSent = true;
				console.log('SMS notification sent successfully');
			} catch (smsError) {
				console.error('SMS notification failed:', smsError);
				lastError = smsError instanceof Error ? smsError.message : 'SMS failed';
			}
		}

		if (notificationSent) {
			return {
				success: true,
				message: 'Login notification sent successfully'
			};
		} else {
			return {
				success: false,
				message: `Failed to send notification: ${lastError}`
			};
		}

	} catch (error) {
		console.error('Error sending login notification:', error);
		return {
			success: false,
			message: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// Generic notification function for future use
export async function sendNotification(options: NotificationOptions): Promise<boolean> {
	try {
		if (!accountSid || !authToken) {
			console.warn('Twilio credentials not configured');
			return false;
		}

		const client = twilio(accountSid, authToken);
		
		if (options.type === 'whatsapp') {
			if (!twilioWhatsAppNumber) {
				throw new Error('WhatsApp number not configured');
			}
			
			await client.messages.create({
				body: options.message,
				from: twilioWhatsAppNumber,
				to: `whatsapp:${options.to}`
			});
		} else {
			if (!twilioPhoneNumber) {
				throw new Error('Phone number not configured');
			}
			
			await client.messages.create({
				body: options.message,
				from: twilioPhoneNumber,
				to: options.to
			});
		}
		
		return true;
	} catch (error) {
		console.error('Error sending notification:', error);
		return false;
	}
}
