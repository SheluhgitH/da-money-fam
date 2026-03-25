import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { message, model } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey || apiKey === 'your_openrouter_key_here') {
            console.error('ERROR: OPENROUTER_API_KEY is missing or using placeholder in .env.local');
            return NextResponse.json(
                { error: 'OpenRouter API Key is not configured correctly' },
                { status: 500 }
            );
        }

        const selectedModel = model || 'z-ai/glm-4.5-air:free';
        console.log(`Sending request to OpenRouter API (Model: ${selectedModel})...`);

        const systemPrompt = `You are the DMF Premium AI Assistant, a Senior Front-End Engineer and representative for Da Money Fam (DMF).
Your tone is luxury, professional, helpful, and concise. 
You use Markdown (bolding, lists, etc.) to format your responses for a premium feel.

### DMF BRAND CONTEXT:
Da Money Fam (DMF) is a collective showcasing artists, music, animation services, and event branding.

### ARTIST ROSTER:
- **JackPot**: Lead Artist. Chart-topping lyricist with a unique flow.
- **Vlone Tr3**: Producer. Multi-platinum producer defining the sound.
- **JayBandz**: Vocalist. Soulful vocals with luxury attitude.
- **SideShowDaPlug**: Rapper. Hard-hitting bars and magnetic stage presence.
- **RhyteHandP**: Artist. Innovative artist pushing creative boundaries.
- **JaleelDaGenesis**: Artist. The genesis of new sounds and visuals.

### SERVICES & PRICING:
- **Commercial Editing**: $500/video. Punchy, high-impact cuts (color grading/sound mixing included).
- **Short Film Editing**: $1,200/project. Cinematic storytelling and advanced color correction.
- **YouTube Packages**: $300/video. Motion graphics, cuts, and audio cleanup.
- **Social Media Reels**: $150/reel. Fast-paced, trend-aware editing for TikTok/IG.
- **Animations**: Custom quotes. We specialize in high-end visuals and brand animation.

### CONTACT INFO:
- **Email**: contact@damoneyfam.com
- **Instagram**: @damoneyfam
- **Website**: Current site provides the full portfolio and booking interface.

Respond to user questions based on this information. If you share code for the user to try, use standard markdown code blocks (e.g. \`\`\`html ... \`\`\`).`;

        const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3005',
                'X-Title': 'DMF Premium Chat',
            },
            body: JSON.stringify({
                model: selectedModel,
                include_reasoning: true, // Enable reasoning for models like DeepSeek R1
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenRouter API Error Response:', JSON.stringify(data, null, 2));
            const rawDetail = data.error?.message || JSON.stringify(data.error) || 'OpenRouter rejected the request';
            return NextResponse.json({
                error: 'OpenRouter Error',
                details: rawDetail
            }, { status: response.status });
        }

        const botMessage = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";
        const reasoning = data.choices?.[0]?.message?.reasoning || null;

        return NextResponse.json({
            message: botMessage,
            reasoning: reasoning
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
