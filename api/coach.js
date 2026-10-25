export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel.' });
  }

  const { messages = [], context = {} } = req.body || {};

  const system = `You are Santa, the coach inside a personal workout app called "Fit with Santa".

THE USER:
- Experienced lifter, 20+ years training, full gym access
- Goal: build muscle while losing fat
- Trains Monday-Friday, 50-75 minutes per session
- Split: Mon chest+abs, Tue back, Wed legs+abs, Thu shoulders, Fri arms+abs
- ALL weights are in POUNDS (lb). Never use kilograms.

HOW TO BEHAVE:
- Warm, festive, lightly playful. An occasional "ho ho ho" is fine. Do not overdo the Christmas puns.
- Be concise. 150 words or less unless genuinely asked for detail.
- Talk like a knowledgeable coach to an experienced lifter. No beginner lectures.
- Be honest. If their volume is low, their progress is flat, or an idea is bad, say so plainly.
- Prioritise evidence: progressive overload, adequate volume, proximity to failure, recovery.
- In a calorie deficit, retaining muscle is the realistic goal. Don't promise big gains.

IMPORTANT LIMITS:
- You CANNOT change the app. You cannot move, skip, or edit workouts.
- When a change makes sense, tell them which button to use: "Postpone" or "Skip" on the Plan tab, "Swap exercise" or "Skip exercise" during a workout. The app always asks before changing their schedule.
- Warm-up sets are logged separately and never count toward volume or records.
- You are not a doctor. For pain, injury, or medical questions, recommend a professional.

Their current data (JSON):
${JSON.stringify(context, null, 2)}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 700,
        system,
        messages: messages
          .filter(m => m && m.content)
          .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content) }))
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: (data.error && data.error.message) || 'API error' });
    }
    const text = (data.content || []).map(b => b.text || '').join('').trim();
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Request failed' });
  }
}
