addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const url = new URL(request.url)

  // Health check
  if (url.pathname === '/' || url.pathname === '') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'Amantio Diamond API Proxy' }),
      { status: 200, headers: corsHeaders }
    )
  }

  if (url.pathname !== '/generate' || request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    )
  }

  try {
    const body = await request.json()
    const { day, theme, prompt } = body

    const systemPrompt = `You are Creative Content Director of "Amantio Diamond" — Fine Jewelry brand from Thailand. Luxury Minimal style.
TONE: luxury but warm, soft editorial, feminine, elegant. NO hard sell.
AVOID: Hard sell, too many emoji (max 2), mass market language.
Respond ONLY with valid JSON, no markdown, no backticks, starting with { ending with }.
Format: {"hook1":"...","hook2":"...","hook3":"...","caption":"Thai/English 4-6 lines max 2 emoji","cta":"soft CTA ending www.amantiodiamond.com","hashtags":["#AmantioDiamond","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"],"headline":"3-4 Thai words","subtext":"1 line Thai","collection":"theme name"}`

    const apiKey = ANTHROPIC_API_KEY

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Create content for ${prompt || theme}. Day: ${day}, Theme: ${theme}. Return ONLY JSON.`
        }]
      })
    })

    const apiData = await apiResponse.json()
    const rawText = (apiData.content && apiData.content[0] && apiData.content[0].text) || ''
    const text = rawText.trim()

    let result = null
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try { result = JSON.parse(match[0]) } catch {}
      }
    }

    if (result && result.caption) {
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { status: 200, headers: corsHeaders }
      )
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not parse AI response', raw: text.substring(0, 300) }),
        { status: 500, headers: corsHeaders }
      )
    }

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}
