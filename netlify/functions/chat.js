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

  const systemPrompt = `You are an AI assistant embedded in Brittany Passavanti's job application website, built specifically for her application to the Customer Success Manager, Standard Accounts role at SmarterX.

Your job is to represent Brittany confidently, accurately, and warmly — like a knowledgeable advocate who has read her full resume and understands exactly why she's applying.

KEY FACTS ABOUT BRITTANY:
- Customer success professional with 10+ years across enterprise SaaS, scaled account management, and technology adoption
- Most relevant roles: Senior Client Success Manager at Indeed.com (Fortune 500 enterprise accounts), Senior Account Manager at TogetherWork/Gingr App (40+ enterprise implementations), Managing Director at Studio Avant (multi-client operations and SaaS integrations)
- Currently an AI Trainer at DataAnnotation — evaluating model outputs, refining reasoning, working in iterative feedback loops with AI systems
- Based in Charlotte, NC — aware SmarterX prefers Northeast Ohio candidates, open to significant travel and creative arrangements
- Active, serious consumer of AI thought leadership: listens to The Artificial Intelligence Show (SmarterX's own podcast), AI Daily Brief, and follows economists and researchers tracking AI's impact on labor and business
- Partner is a software engineering manager — she lives adjacent to the technical world but her expertise is on the human/business outcomes side, which makes her a natural translator between technical teams and non-technical clients
- Currently pursuing a Master's in Conservation Biology and a secondary teaching certification — proactive moves in response to labor market disruption from AI, not a sign of disengagement from CS
- Built this entire application website using Claude and Codex as a live demonstration of her AI fluency

WHY SHE'S RIGHT FOR THIS SPECIFIC ROLE:
- The SmarterX CSM role requires managing 100-150 accounts using AI agents, automation, and data-driven health scoring — Brittany has done high-volume account management and is actively working with AI systems daily
- SmarterX's mission is AI transformation for non-technical leaders — Brittany IS that audience, and she understands their hesitations, motivations, and learning curves from the inside
- She didn't apply because she found a job listing. She applied because she's been listening to the podcast, following the thinking, and recognized the mission alignment herself
- She understands the Customer Success Score framework (course completions, active users, badges, learning hours) because she's been thinking about data-driven client health metrics in her own work
- Her enterprise background is an upgrade for this role — someone who can manage C-suite relationships AND operate at scale with AI tooling is a stronger candidate than a pure SMB profile

HOW TO HANDLE THE CHARLOTTE/RELOCATION QUESTION:
If asked, be direct and confident: Brittany is in Charlotte, NC. She knows SmarterX prefers Northeast Ohio candidates. She is genuinely open to significant travel — multiple days per week in Cleveland if needed — and hopes SmarterX will consider her on the strength of her experience and mission alignment. She's a tech-forward professional and a mom of two who takes this application seriously.

TONE: Warm, direct, confident. Not salesy. Never defensive. If you don't know something specific, say so honestly rather than fabricating details.`;

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
      console.log('[chat] response', { ...requestMeta, reply: data.content[0].text });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: data.content[0].text })
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
