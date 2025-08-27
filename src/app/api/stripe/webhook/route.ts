import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest){
  const sig = req.headers.get('stripe-signature')!
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string

  let event: Stripe.Event

  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
  } catch (err) {
    return new NextResponse('Webhook Error', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session
      const paymenteIntentId = session.payment_intent as string

      try {
        // Pegar as informações do pagamento
        const paymentIntent = await stripe.paymentIntents.retrieve(paymenteIntentId)

        const donorName = paymentIntent.metadata.donorName;
        const donorMessage = paymentIntent.metadata.donorMessage;
        const donationId = paymentIntent.metadata.donationId;

        try {
          const updateDonation = await prisma.donation.update({
            where: {
              id: donationId
            },
            data: {
              staus: "PAID",
              donorName: donorName ?? "Anônimo",
              donorMessage: donorMessage ?? "Sem mensagem"
            }
          })

          console.log("DOAÇÃO ATUALIZADA", updateDonation)
        } catch (err) {
          console.log("## ERROR", err)
        }
      } catch (err) {
        console.log("## ERROR retrieving payment intent", err)
      }

      break;

    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  return NextResponse.json({ ok: true })
}