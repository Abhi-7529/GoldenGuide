import type Stripe from "stripe";
import { env } from "~/env";
import { stripe, syncSubscription } from "~/lib/stripe";

// Keeps memberships in sync when subscriptions change outside the app
// (renewals, failed payments, cancellations from the billing portal).
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook secret is not configured.", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature.", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          await syncSubscription(
            await stripe.subscriptions.retrieve(session.subscription),
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return new Response("Webhook handling failed.", { status: 500 });
  }

  return Response.json({ received: true });
}
