'use server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function subscribeNewsletter(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    throw new Error('Email is required');
  }

  // Basic email validation on server side
  const emailRegex = /^[^\s@]+@[^\s@]+(?:\.[^\s@]+)+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  try {
    // Send notification to admin
    await resend.emails.send({
      from: 'contact@damoneyfam.com',
      to: 'percy@damoneyfam.com',
      subject: `New Newsletter Subscription`,
      html: `<p>New subscriber: ${email}</p>`,
    });

    // Send confirmation to subscriber
    await resend.emails.send({
      from: 'contact@damoneyfam.com',
      to: email,
      subject: 'Welcome to Da Money Fam - Your VIP Access is Activated!',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <!-- Header with branding -->
          <div style="background: linear-gradient(45deg, #FFD700, #FFA500); padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #000000;">🎤 DA MONEY FAM</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #000000;">Luxury Hip-Hop Collective</p>
          </div>

          <!-- Welcome message -->
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #FFD700; font-size: 24px; margin-bottom: 20px;">🎉 WELCOME ABOARD!</h2>
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
              Your VIP access to luxury hip-hop culture has been activated! You're now part of an exclusive community pushing boundaries and setting trends.
            </p>

            <!-- Benefits section -->
            <div style="background: rgba(255, 215, 0, 0.1); padding: 25px; border-radius: 15px; margin: 30px 0; border-left: 4px solid #FFD700;">
              <h3 style="color: #FFD700; margin-bottom: 20px; font-size: 20px;">🎵 WHAT YOU'LL GET:</h3>
              <ul style="text-align: left; padding-left: 20px; margin: 0; list-style: none;">
                <li style="margin-bottom: 10px; font-size: 16px;">• <strong>Exclusive music drops</strong> before anyone else</li>
                <li style="margin-bottom: 10px; font-size: 16px;">• <strong>Behind-the-scenes content</strong> & artist interviews</li>
                <li style="margin-bottom: 10px; font-size: 16px;">• <strong>VIP event invitations</strong> & early access</li>
                <li style="margin-bottom: 10px; font-size: 16px;">• <strong>Special offers</strong> on merch & experiences</li>
                <li style="margin-bottom: 0; font-size: 16px;">• <strong>Industry insights</strong> & culture updates</li>
              </ul>
            </div>

            <!-- Social media section -->
            <div style="margin: 30px 0;">
              <h3 style="color: #FFD700; margin-bottom: 15px;">🚀 STAY CONNECTED:</h3>
              <p style="margin-bottom: 20px;">Follow us on social media for daily updates and exclusive content</p>
              <div style="display: inline-block;">
                <a href="https://www.instagram.com/damoneyfam/" style="display: inline-block; margin: 0 10px; padding: 10px; background: #FFD700; color: #000; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px; font-size: 18px;">📷</a>
                <a href="https://www.instagram.com/damoneyfam/" style="display: inline-block; margin: 0 10px; padding: 10px; background: #FFD700; color: #000; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px; font-size: 18px;">🐦</a>
                <a href="https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-" style="display: inline-block; margin: 0 10px; padding: 10px; background: #FFD700; color: #000; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px; font-size: 18px;">▶️</a>
                <a href="https://www.tiktok.com/@jackpotofficial?_r=1&_t=ZP-93KH1QM9PwM" style="display: inline-block; margin: 0 10px; padding: 10px; background: #FFD700; color: #000; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px; font-size: 18px;">🎵</a>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: rgba(255, 255, 255, 0.05); padding: 20px 30px; text-align: center; border-top: 1px solid rgba(255, 215, 0, 0.3);">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #cccccc;">
              <a href="#" style="color: #FFD700; text-decoration: none;">Unsubscribe</a> •
              <a href="#" style="color: #FFD700; text-decoration: none;">Update Preferences</a>
            </p>
            <p style="margin: 0; font-size: 12px; color: #888888;">
              © 2026 Da Money Fam. All rights reserved.<br>
              Setting trends in music, fashion, and culture.
            </p>
          </div>
        </div>
      `,
    });
   } catch (error) {
     // Log error in development only
     if (process.env.NODE_ENV === 'development') {
       console.error('Newsletter subscription error:', error);
     }
     throw new Error('Failed to subscribe. Please try again.');
   }
}