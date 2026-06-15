import * as yup from 'yup'

export const songSchema = yup.object({
  title: yup.string().trim().min(1).max(255).required(),
  artist: yup.string().trim().min(1).max(255).required(),
  price: yup.number().min(0).max(9999).required(),
  genre: yup.string().trim().max(100).optional(),
  release_date: yup.string().optional(),
  description: yup.string().trim().max(1000).optional(),
  is_promoted: yup.boolean().required(),
  is_published: yup.boolean().required(),
  for_sale: yup.boolean().default(true),
})

export const songUpdateSchema = songSchema

export const orderSchema = yup.object({
  song_id: yup.string().trim().min(1).required(),
  buyer_email: yup.string().trim().email().required(),
  buyer_name: yup.string().trim().min(1).max(255).required(),
  payment_proof: yup.string().trim().min(3).max(500).required(),
  payment_method: yup.string().trim().min(1).max(100).required(),
})

export const paymentSettingsSchema = yup.object({
  paypal_email: yup.string().trim().email().required(),
  cashapp_tag: yup.string().trim().max(100).required(),
  venmo_handle: yup.string().trim().max(100).required(),
  contact_email: yup.string().trim().email().required(),
  instructions: yup.string().trim().max(2000).required(),
})
