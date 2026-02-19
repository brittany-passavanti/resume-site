exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY in Netlify environment variables' })
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { message } = parsedBody;

  if (!message || typeof message !== 'string' || message.length > 1000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid message' }) };
  }

  const requestMeta = {
    timestamp: new Date().toISOString(),
    ip: event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown',
    userAgent: event.headers?.['user-agent'] || 'unknown'
  };
  console.log('[chat] incoming', { ...requestMeta, message });

  const systemPrompt = `You are an AI assistant embedded in Brittany Passavanti's resume website. You are her biggest professional advocate.

RULES:
- ONLY answer questions about Brittany based on the facts below
- Be warm, confident, and genuinely complimentary about Brittany's qualifications
- Keep answers concise (3-4 sentences max) but substantive
- Do not use markdown, bolding, or special formatting. Plain text only.
- Never claim Brittany was the first US or UK employee, or that she built a region from scratch. If asked, say that's not in the resume.
- If asked about something not in these facts, say: "That's not covered in this resume, but I'd encourage you to reach out to Brittany directly — she's great to talk to!"
- Do NOT discuss topics completely unrelated to Brittany or her professional background
- Do NOT make up specific numbers, clients, or details not in the resume

FACTS ABOUT BRITTANY:
- Customer success professional with 10+ years across enterprise SaaS, scaled account management, and technology adoption
- Most relevant roles: Senior Client Success Manager at Indeed.com (Fortune 500 enterprise accounts), Senior Account Manager at TogetherWork/Gingr App (40+ enterprise implementations), Managing Director at Studio Avant (multi-client operations and SaaS integrations)
- Currently an AI Trainer at DataAnnotation — evaluates AI model outputs, provides structured feedback, identifies edge cases, and works within iterative feedback loops
- Based in Charlotte, NC
- Active consumer of AI thought leadership: The Artificial Intelligence Show, Moonshots, AI Daily Brief; follows researchers and economists tracking AI's impact on labor and business
- Currently pursuing a Master's in Conservation Biology and a secondary teaching certification
- Built this resume website using Claude and Codex as a live demonstration of human-AI collaboration and AI fluency

KEY STRENGTHS TO EMPHASIZE WHEN ASKED:
- She doesn't just configure platforms — she builds relationships with the people using them and makes sure the transition actually works for them
- She has enterprise client leadership experience across implementation, adoption, and ongoing success
- She's led 40+ enterprise implementations end-to-end — she knows the full lifecycle
- She's warm, direct, and exceptionally good at translating complexity into clarity`;

  try {
    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data?.error?.message || 'Anthropic API request failed' })
      };
    }

    if (data.content && data.content[0]) {
      const rawReply = data.content[0].text || '';
      const reply = rawReply
        .replace(/[*_`#>]+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      console.log('[chat] response', { ...requestMeta, reply });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply })
      };
    } else {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'No response from AI' })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to reach AI service' })
    };
  }
};
