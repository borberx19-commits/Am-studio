// Cloudflare Worker — Amantio Diamond API Proxy
// Deploy ฟรีที่ workers.cloudflare.com

export default {
  async fetch(request, env) {
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'Amantio Diamond API' }), { headers: CORS });
    }

    if (url.pathname !== '/generate' || request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: CORS });
    }

    try {
      const { day, theme, prompt } = await request.json();

      const SYSTEM = `You are Creative Content Director of "Amantio Diamond" — Fine Jewelry & Fashion Jewelry, Luxury Minimal brand from Thailand.
BRAND: Self-love, Confidence, Meaningful Jewelry, Modern Feminine, Everyday Luxury, Quiet Luxury
TARGET: Women 25-45, modern lifestyle, buy jewelry as self-gift or for loved ones
TONE: luxury but warm, soft editorial, feminine, elegant. NO hard sell. Think European jewelry brand.
KEYWORDS: Self-love, Everyday confidence, Quiet luxury, Meaningful jewelry, A gift for yourself, Effortless beauty
AVOID: Hard sell, too many emoji (max 2), mass market language, price focus
Respond ONLY with valid JSON starting with { and ending with }. No markdown, no backticks.
Format: {"hook1":"...","hook2":"...","hook3":"...","caption":"Thai/English mix 4-6 lines max 2 emoji","cta":"soft CTA 1 line ending www.amantiodiamond.com","hashtags":["#AmantioDiamond","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"],"headline":"3-4 Thai words","subtext":"1 line Thai","collection":"theme name","canva_search":"3-5 English keywords to search Canva templates for this theme"}`;

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system: SYSTEM,
          messages: [{ role: 'user', content: `Create content for ${prompt}. Day: ${day} theme: ${theme}. Return ONLY JSON.` }]
        })
      });

      const data = await apiRes.json();
      const text = (data.content?.[0]?.text || '').trim();

      let result = null;
      try { result = JSON.parse(text); } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) try { result = JSON.parse(m[0]); } catch {}
      }

      if (result) {
        return new Response(JSON.stringify({ success: true, data: result }), { headers: CORS });
      } else {
        return new Response(JSON.stringify({ error: 'Invalid AI response' }), { status: 500, headers: CORS });
      }

    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }
};
