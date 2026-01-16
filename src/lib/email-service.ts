import nodemailer from 'nodemailer';

// Email configuration from environment variables
// Default to sjdap.org domain SMTP settings
const emailHost = process.env.EMAIL_HOST || 'smtp.office365.com'; // Microsoft 365 / Outlook for organizations
const emailPort = parseInt(process.env.EMAIL_PORT || '587');
const emailUser = process.env.EMAIL_USER || 'karim.fayazi@sjdap.org';
const emailPassword = process.env.EMAIL_PASSWORD;
const emailFrom = process.env.EMAIL_FROM || 'karim.fayazi@sjdap.org';

// Create transporter
const createTransporter = () => {
	if (!emailUser || !emailPassword) {
		console.warn('Email credentials not configured. Email service will not work.');
		return null;
	}

	return nodemailer.createTransport({
		host: emailHost,
		port: emailPort,
		secure: emailPort === 465, // true for 465, false for other ports
		auth: {
			user: emailUser,
			pass: emailPassword,
		},
	});
};

/**
 * Send password change notification email
 */
export async function sendPasswordChangeEmail(
	userEmail: string,
	userName: string,
	timestamp: Date = new Date()
): Promise<{ success: boolean; message: string }> {
	try {
		const transporter = createTransporter();
		
		if (!transporter) {
			console.warn('Email service not configured. Skipping email notification.');
			return {
				success: false,
				message: 'Email service not configured'
			};
		}

		// Format the timestamp
		const formattedTime = timestamp.toLocaleString('en-US', {
			timeZone: 'Asia/Karachi',
			dateStyle: 'medium',
			timeStyle: 'short'
		});

		// Email content
		const subject = 'PE-MIS - Update Password';
		
		const htmlContent = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Password Update Notification</title>
			</head>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
				<div style="background-color: #0b4d2b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
					<h1 style="margin: 0; font-size: 24px;">PE-MIS - Update Password</h1>
				</div>
				<div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; border: 1px solid #ddd;">
					<p style="font-size: 16px; margin-bottom: 20px;">Dear ${userName || 'User'},</p>
					
					<p style="font-size: 14px; margin-bottom: 15px;">
						This is to confirm that your password has been successfully updated in the PE-MIS system.
					</p>
					
					<div style="background-color: white; padding: 15px; border-left: 4px solid #0b4d2b; margin: 20px 0;">
						<p style="margin: 5px 0; font-size: 14px;"><strong>User ID:</strong> ${userEmail}</p>
						<p style="margin: 5px 0; font-size: 14px;"><strong>Full Name:</strong> ${userName || 'N/A'}</p>
						<p style="margin: 5px 0; font-size: 14px;"><strong>Update Time:</strong> ${formattedTime}</p>
					</div>
					
					<p style="font-size: 14px; margin-top: 20px; margin-bottom: 10px;">
						<strong>Important Security Information:</strong>
					</p>
					<ul style="font-size: 14px; margin-left: 20px; padding-left: 0;">
						<li>Your password has been changed successfully</li>
						<li>If you did not make this change, please contact your system administrator immediately</li>
						<li>Keep your password secure and do not share it with anyone</li>
						<li>For security reasons, we recommend changing your password regularly</li>
					</ul>
					
					<p style="font-size: 14px; margin-top: 30px; margin-bottom: 10px;">
						If you have any questions or concerns, please contact the MIS support team.
					</p>
					
					<p style="font-size: 14px; margin-top: 30px; color: #666;">
						Best regards,<br>
						<strong>PE-MIS System</strong>
					</p>
				</div>
				<div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
					<p>This is an automated email. Please do not reply to this message.</p>
				</div>
			</body>
			</html>
		`;

		const textContent = `
PE-MIS - Update Password

Dear ${userName || 'User'},

This is to confirm that your password has been successfully updated in the PE-MIS system.

User ID: ${userEmail}
Full Name: ${userName || 'N/A'}
Update Time: ${formattedTime}

Important Security Information:
- Your password has been changed successfully
- If you did not make this change, please contact your system administrator immediately
- Keep your password secure and do not share it with anyone
- For security reasons, we recommend changing your password regularly

If you have any questions or concerns, please contact the MIS support team.

Best regards,
PE-MIS System

---
This is an automated email. Please do not reply to this message.
		`;

		// Ensure user email uses @sjdap.org domain if it doesn't already
		// If userEmail doesn't contain @, assume it's just the username and append @sjdap.org
		let recipientEmail = userEmail;
		if (!userEmail.includes('@')) {
			recipientEmail = `${userEmail}@sjdap.org`;
		} else if (!userEmail.endsWith('@sjdap.org')) {
			// If email has different domain, log warning but still send
			console.warn(`Email ${userEmail} does not use @sjdap.org domain`);
		}

		// Send email
		await transporter.sendMail({
			from: `"PE-MIS System" <${emailFrom}>`,
			to: recipientEmail,
			subject: subject,
			text: textContent,
			html: htmlContent,
		});

		console.log(`Password change email sent successfully to ${recipientEmail}`);
		
		return {
			success: true,
			message: 'Email sent successfully'
		};
	} catch (error) {
		console.error('Error sending password change email:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			success: false,
			message: `Failed to send email: ${errorMessage}`
		};
	}
}
