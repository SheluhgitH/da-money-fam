'use server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const projectType = formData.get('projectType') as string;
  const message = formData.get('message') as string;
  const budget = formData.get('budget') as string;

  // Basic validation (expand with yup if needed)
  if (!name || !email || !phone || !message) {
    throw new Error('All required fields must be filled.');
  }

  try {
    const result = await resend.emails.send({
       from: 'contact@damoneyfam.com',
       to: 'contact@damoneyfam.com',
       subject: `New Project Inquiry from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Project Type:</strong> ${projectType || 'Not specified'}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Budget:</strong> ${budget || 'Not specified'}</p>
      `,
    });
  } catch (error) {
     console.error('Resend error:', error);
     throw new Error('Failed to send email. Please try again.');
   }
}