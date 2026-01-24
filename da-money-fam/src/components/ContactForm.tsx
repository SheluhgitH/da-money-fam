'use client';
import { useState } from 'react';
import { sendEmail } from '../app/actions/sendEmail';

interface ContactFormProps {
  onClose: () => void;
}

export default function ContactForm({ onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: '',
    message: '',
    budget: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+(?:\.[^\s@]+)+$/.test(formData.email)) newErrors.email = 'Please enter a valid email';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (!/^\+?1?\s*(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}$/.test(formData.phone)) newErrors.phone = 'Please enter a valid phone number';
    if (!formData.projectType) newErrors.projectType = 'Project type is required';
    if (!formData.message) newErrors.message = 'Message is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      await sendEmail(data);
      setSubmitMessage('Thank you! We\'ll contact you soon.');
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      setSubmitMessage('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white mb-1">Name *</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none"
          placeholder="Your name"
        />
        {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-white mb-1">Email *</label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none"
          placeholder="your@email.com"
        />
        {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-white mb-1">Phone *</label>
        <input
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none"
          placeholder="(123) 456-7890"
        />
        {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-white mb-1">Project Type *</label>
        <select
          name="projectType"
          value={formData.projectType}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none"
        >
          <option value="">Select type</option>
          <option value="Animation">Animation</option>
          <option value="Video Editing">Video Editing</option>
          <option value="Other">Other</option>
        </select>
        {errors.projectType && <p className="text-red-400 text-sm">{errors.projectType}</p>}
      </div>

      <div>
        <label className="block text-white mb-1">Message *</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none h-24"
          placeholder="Tell us about your project"
        />
        {errors.message && <p className="text-red-400 text-sm">{errors.message}</p>}
      </div>

      <div>
        <label className="block text-white mb-1">Budget Range</label>
        <select
          name="budget"
          value={formData.budget}
          onChange={handleChange}
          className="w-full p-2 rounded bg-black/20 border border-white/20 text-white focus:border-gold outline-none"
        >
          <option value="">Select budget</option>
          <option value="Under $1,000">Under $1,000</option>
          <option value="$1,000 - $5,000">$1,000 - $5,000</option>
          <option value="$5,000 - $10,000">$5,000 - $10,000</option>
          <option value="Over $10,000">Over $10,000</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 bg-gold text-black font-bold rounded hover:bg-gold/80 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      {submitMessage && <p className="text-center text-white">{submitMessage}</p>}
    </form>
  );
}