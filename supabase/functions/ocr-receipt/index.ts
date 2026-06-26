import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Image, mimeType } = await req.json()

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: 'Missing base64Image' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const apiKey = Deno.env.get('VITE_GEMINI_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Gemini API key is not configured on the server.')
    }

    const prompt = `You are a UPI payment receipt parser. Analyze this payment screenshot carefully and extract these fields:
1. "amount": The rupee amount paid (number, e.g. 2000.00). Look for the ₹ symbol or "Rs." followed by a number.
2. "utr": The 12-digit transaction reference number (string). Labeled as UTR, Ref No, Transaction ID, UPI Ref, or similar.
3. "date": The payment date in YYYY-MM-DD format.

Return ONLY a raw JSON object (no conversational text, no markdown fences):
{"amount": 2000.00, "utr": "612345678901", "date": "2026-06-25"}`

    const makeGeminiRequest = async (modelName: string) => {
      return await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Image } }
              ]
            }],
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: { 
              temperature: 0, 
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  amount: { type: "NUMBER", description: "The rupee amount paid (e.g. 1.00)" },
                  utr: { type: "STRING", description: "The 12-digit UPI transaction reference number / UTR" },
                  date: { type: "STRING", description: "The payment date in YYYY-MM-DD format" }
                },
                required: []
              }
            }
          })
        }
      )
    }

    let response = await makeGeminiRequest("gemini-2.5-flash")

    // Auto-fallback to gemini-2.5-flash-lite if the primary model is busy/rate-limited or down
    if (!response.ok || response.status === 503 || response.status === 429) {
      console.warn("gemini-2.5-flash failed or busy. Falling back to gemini-2.5-flash-lite...");
      response = await makeGeminiRequest("gemini-2.5-flash-lite");
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const geminiData = await response.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    return new Response(
      JSON.stringify({ rawText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error("Error processing receipt OCR:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
