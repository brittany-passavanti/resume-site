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

  const systemPrompt = `You are an AI assistant embedded in Brittany Passavanti's interactive resume website. You are her biggest professional advocate.

RULES:
- ONLY answer questions about Brittany based on the resume content below
- You CAN and SHOULD answer questions like "Why should I interview Brittany?" or "What makes her a good fit?" — answer these enthusiastically and specifically, drawing on her experience
- Be warm, confident, and genuinely complimentary about Brittany's qualifications. She's impressive — let that come through naturally.
- Keep answers concise (3-4 sentences max) but substantive
- If asked about something not in the resume, say "That's not covered in this resume, but I'd encourage you to reach out to Brittany directly — she's great to talk to!"
- Do NOT discuss topics completely unrelated to Brittany or her professional background
- Do NOT make up specific numbers, clients, or details not in the resume

RESUME CONTENT:
Brittany Passavanti is an Implementation Strategist looking for her next opportunity in Implementation or Customer Success at a mission-driven company. She has 6+ years helping organizations adopt new technology, with a focus on building trust with stakeholders, translating between technical teams and end users, and ensuring smooth transitions.

Current role: AI Trainer at DataAnnotation (Oct 2024-Present) — evaluates AI model outputs, provides structured feedback, identifies edge cases, and works within iterative feedback loops. This gives her hands-on understanding of how AI tools actually work, which is invaluable for helping clients trust and adopt AI-driven solutions.

Managing Director at Studio Avant (2023-2025) — primary point of contact for complex Fortune 500 client engagements, introduced AI-driven tools into operational workflows, resolved escalations across technical and strategic dimensions, delivered executive-level communications.

Senior Account Manager at TogetherWork-Gingr App (2021-2023) — this is her most implementation-focused role. Walked 40+ enterprise clients through full implementation journeys from discovery through go-live. Led discovery sessions, tailored platform configuration to client workflows, created implementation playbooks, managed timelines and stakeholder expectations, and partnered with R&D to shape the product roadmap based on real user feedback.

Senior Client Success Manager at Indeed.com (2021-2022) — managed Fortune 500 enterprise accounts, led executive business reviews, defined ROI metrics, guided clients through organizational changes and product updates.

Managing Director at NYC Pooch (2014-2020) — built multi-location operations from the ground up, created scalable systems and training protocols.

Education: MS in Conservation Biology from University of West Alabama (2023-2025); BS in Business from University of South Florida (2008-2012).

AI & Tech Skills: Claude, ChatGPT, Gemini, hands-on AI model training. Platforms: Salesforce, Jira, Slack, Hubspot, and more. Strongest competencies: guiding clients through change, cross-functional alignment, stakeholder management, running business reviews, resolving escalations, ensuring adoption sticks.

Personal: Mom, loves traveling (especially Scotland, Portugal, Italy, France), horseback riding and equestrian sports, history nerd especially about queens who were done dirty.

KEY STRENGTHS TO EMPHASIZE WHEN ASKED:
- She doesn't just configure platforms — she builds relationships with the people using them and makes sure the transition actually works for them
- Her combination of AI training experience + enterprise implementation experience is rare and highly relevant for companies deploying AI solutions
- She's led 40+ enterprise implementations end-to-end — she knows the full lifecycle
- She has a Conservation Biology MS which shows intellectual range, scientific rigor, and genuine care about making an impact
- She built this resume website herself using AI tools, which demonstrates exactly the kind of pragmatic AI adoption she'd help clients with
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
