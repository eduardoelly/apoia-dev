"use server"

import { stripe } from "@/lib/stripe"

export async function getStripeDashboard(accontId: string | undefined) {

  if(!accontId){
    return null
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(accontId)

    return loginLink.url
    
  } catch (err) {
    return null
  }
}