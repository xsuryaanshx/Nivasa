import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "nivasa_webhook_2026";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";

// Send a WhatsApp text message
async function sendWhatsAppMessage(to: string, message: string) {
  const response = await fetch(
    `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    }
  );
  return response.json();
}

// Process incoming WhatsApp messages
async function handleIncomingMessage(body: Record<string, unknown>) {
  try {
    const entry = (body.entry as Array<{ changes: Array<{ value: { messages?: Array<{ from: string; type: string; text?: { body: string } }> } }> }>)?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const from = message.from; // sender's phone number
    const messageType = message.type;

    console.log(`📩 New message from ${from}: type=${messageType}`);

    if (messageType === "text") {
      const text = message.text?.body?.toLowerCase() ?? "";
      console.log(`💬 Text: ${text}`);

      // Auto-reply logic
      let reply = "Thank you for contacting *Nivasa*! 🏠\n\n";

      if (text.includes("hello") || text.includes("hi") || text.includes("namaste")) {
        reply += "Welcome to Nivasa! How can we help you today?\n\n" +
          "Reply with:\n" +
          "1️⃣ *book* - Book a property\n" +
          "2️⃣ *status* - Check booking status\n" +
          "3️⃣ *contact* - Talk to an agent";
      } else if (text.includes("book") || text === "1") {
        reply += "To book a property, please visit:\n🔗 https://nivasa.in\n\nOr reply with your *property ID* and we'll assist you!";
      } else if (text.includes("status") || text === "2") {
        reply += "To check your booking status, please share your *booking ID* or *phone number* registered with us.";
      } else if (text.includes("contact") || text === "3") {
        reply += "Our team will contact you shortly! 📞\n\nFor urgent queries: nivasabyamigroup@gmail.com";
      } else {
        reply += "We received your message and will get back to you soon! 🙏\n\nFor quick help, visit: https://nivasa.in";
      }

      await sendWhatsAppMessage(from, reply);
      console.log(`✅ Reply sent to ${from}`);
    }
  } catch (error) {
    console.error("❌ Error handling message:", error);
  }
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  // ─── GET: Webhook verification by Meta ───────────────────────────────────
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log(`🔍 Verification request: mode=${mode}, token=${token}`);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified successfully!");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.error("❌ Verification failed - token mismatch");
      return new Response("Forbidden", { status: 403 });
    }
  }

  // ─── POST: Incoming messages from WhatsApp ────────────────────────────────
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("📨 Webhook payload:", JSON.stringify(body, null, 2));

      // Process in background (respond quickly to Meta)
      handleIncomingMessage(body as Record<string, unknown>);

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("❌ Error parsing webhook:", error);
      return new Response("Bad Request", { status: 400 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
