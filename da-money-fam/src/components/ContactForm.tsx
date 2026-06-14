'use client'

import { useState } from 'react';
import { CONFIG } from '../config';


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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    const form = e.currentTarget;
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const data = new FormData(form);
      data.append('_subject', 'New Project Inquiry');

      const response = await fetch(CONFIG.FORMSPREE_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: data
      });

      const result = await response.json();
      if (response.ok) {
        setSubmitMessage('Thank you! We\'ll contact you soon.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          projectType: '',
          message: '',
          budget: '',
        });
        setTimeout(() => onClose(), 2000);
      } else {
        if (Object.hasOwn(result, 'errors')) {
          setSubmitMessage(result.errors.map((error: any) => error.message).join(', '));
        } else {
          setSubmitMessage(result.error || 'Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      setSubmitMessage('Failed to send message. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <label className="block text-gray-200 mb-1">Name *</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-gold outline-none transition-colors"
          placeholder="Your name"
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-gray-200 mb-1">Email *</label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-gold outline-none transition-colors"
          placeholder="your@email.com"
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-gray-200 mb-1">Phone *</label>
        <input
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-gold outline-none transition-colors"
          placeholder="(123) 456-7890"
        />
        {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-gray-200 mb-1">Project Type *</label>
        <select
          name="projectType"
          value={formData.projectType}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-gold outline-none appearance-none pr-8 transition-colors"
        >
          <option value="" className="bg-matte-black text-gray-300">Select type</option>
          <option value="Animation" className="bg-matte-black text-gray-300">Animation</option>
          <option value="Video Editing" className="bg-matte-black text-gray-300">Video Editing</option>
          <option value="Other" className="bg-matte-black text-gray-300">Other</option>
        </select>
        {errors.projectType && <p className="text-red-400 text-sm mt-1">{errors.projectType}</p>}
      </div>

      <div>
        <label className="block text-gray-200 mb-1">Message *</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-gold outline-none h-28 resize-none transition-colors"
          placeholder="Tell us about your project"
        />
        {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
      </div>

      <div>
        <label className="block text-gray-200 mb-1">Budget Range</label>
        <select
          name="budget"
          value={formData.budget}
          onChange={handleChange}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-gold outline-none appearance-none pr-8 transition-colors"
        >
          <option value="" className="bg-matte-black text-gray-300">Select budget</option>
          <option value="Under $1,000" className="bg-matte-black text-gray-300">Under $1,000</option>
          <option value="$1,000 - $5,000" className="bg-matte-black text-gray-300">$1,000 - $5,000</option>
          <option value="$5,000 - $10,000" className="bg-matte-black text-gray-300">$5,000 - $10,000</option>
          <option value="Over $10,000" className="bg-matte-black text-gray-300">Over $10,000</option>
        </select>
      </div>

      {/* Honeypot field for spam prevention */}
      <input type="text" name="_gotcha" style={{ display: 'none' }} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-gold text-matte-black font-bold rounded-lg hover:bg-white transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Sending...' : 'Send Message'}
      </button>

      {submitMessage && <p className="text-center text-green-400 text-sm mt-3">{submitMessage}</p>}
    </form>
  );
}