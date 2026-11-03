import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware for parsing large base64 image uploads
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Lazy shared Server-Side Gemini Client with required User-Agent
function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to clean JSON string from LLM responses
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  }
  return cleaned.trim();
}

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    models: {
      vision: 'gemini-3.8-flash',
      grounding: 'gemini-3.8-flash',
      tts: 'gemini-3.8-flash-tts',
    },
  });
});

// 2. Landmark Recognition via gemini-3.8-flash
app.post('/api/landmark/recognize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Missing imageBase64 data in request body.' });
      return;
    }

    // Strip data URL scheme prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const promptText = `You are a world-class architectural historian and urban tourism AI.
Examine this photograph taken in a city.
Identify the specific landmark, historic monument, cathedral, iconic bridge, ancient ruin, or notable architectural structure in the image.

Output ONLY a valid JSON object with the following schema:
{
  "isRecognized": boolean,
  "landmarkName": string (e.g. "Colosseum", "Eiffel Tower", "Sagrada Família", "Flatiron Building", or specific site name),
  "alternateNames": string[] (e.g. ["Flavian Amphitheatre"]),
  "city": string (e.g. "Rome"),
  "country": string (e.g. "Italy"),
  "category": string (e.g. "Ancient Amphitheatre", "Gothic Cathedral", "Suspension Bridge", "Modernist Skyscraper", "Historic Palace"),
  "architecturalStyle": string (e.g. "Imperial Roman", "French Gothic", "Catalan Modernisme", "Beaux-Arts"),
  "estimatedYearOrEra": string (e.g. "72–80 AD", "1887–1889", "1882–Present"),
  "confidence": number (between 0.0 and 1.0),
  "keyVisualFeatures": string[] (3-5 specific visual details observed in this photo, e.g. "Travertine stone arcades", "Three tiered orders of columns: Doric, Ionic, Corinthian", "Partially preserved outer wall"),
  "visualFocalPoints": [
    {
      "id": "fp-1",
      "label": string (short 2-4 word feature title, e.g. "Upper Arcades"),
      "description": string (1 concise sentence explaining this detail),
      "xPercent": number (approx 10-90% horizontal position on the photo),
      "yPercent": number (approx 10-90% vertical position on the photo)
    }
  ],
  "arNarrationPitch": string (A crisp, dramatic 2-sentence hook for an AR audio guide clip),
  "historicalEras": [
    {
      "eraName": string (e.g. "Construction & Imperial Glory", "Medieval Fortress & Quarry", "Modern Preservation"),
      "timeSpan": string (e.g. "80 AD - 400 AD", "1200 - 1700", "1900 - Present"),
      "atmosphereDescription": string (How the site looked and sounded in this era),
      "wireframeThemeColor": string (hex color code suitable for AR holographic shaders, e.g. "#f59e0b", "#06b6d4", "#a855f7")
    }
  ]
}

If the image is not a recognized landmark (e.g. a random coffee cup, blurry room, or ordinary street corner), set "isRecognized": false, provide a general category description, and offer best guess.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [imagePart, { text: promptText }],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    const cleanedJson = cleanJsonOutput(rawText);
    const parsed = JSON.parse(cleanedJson);

    res.json({
      success: true,
      data: parsed,
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/landmark/recognize:', error);
    res.status(500).json({
      error: error?.message || 'Failed to analyze image with gemini-3.8-flash',
      details: error?.toString(),
    });
  }
});

// 3. Search-Grounded History & Real-Time Facts via gemini-3.8-flash
app.post('/api/landmark/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { landmarkName, city, country } = req.body;

    if (!landmarkName) {
      res.status(400).json({ error: 'Missing landmarkName parameter.' });
      return;
    }

    const searchQuery = `${landmarkName} ${city || ''} ${country || ''} history architecture current status facts`;

    const promptText = `Using Google Search grounding, look up accurate, comprehensive, and up-to-date historical and visiting information for "${landmarkName}" located in ${city || 'its city'}, ${country || ''}.

Provide an in-depth tourist intelligence dossier formatted as follows:

# Summary & Heritage
A vivid 2-paragraph narrative recounting the origin story, original purpose, architects, and engineering wonders.

# Verified Historical Timeline
4 to 5 bullet points with key milestone years and dramatic historical events.

# Lesser-Known Secrets & Curiosities
3 intriguing facts that casual tourists usually miss.

# Modern Status & Visitor Tips
Up-to-date information on current access, recent restorations, or notable current conditions.

# AR Voice Script
A captivating, 4-paragraph narration script designed for an AR tour guide audio clip (approx 45-60 seconds when read aloud). Use vivid descriptive language, dramatic pacing with occasional natural pauses like <breath> or expressive moments to captivate the listener. Make the user feel like they are standing right in front of the monument gazing up at its grandeur.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';

    // Extract search grounding citations
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [searchQuery];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.web && chunk.web.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || 'Source reference',
        url: chunk.web.uri,
      }));

    // Deduplicate sources by URL
    const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.url, s])).values());

    res.json({
      success: true,
      landmarkName,
      historyReport: responseText,
      sources: uniqueSources,
      searchQueries: webSearchQueries,
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/landmark/history:', error);
    res.status(500).json({
      error: error?.message || 'Failed to fetch grounded history with gemini-3.8-flash',
    });
  }
});

// 4. Text-to-Speech Narration via gemini-3.8-flash-tts
app.post('/api/landmark/narrate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      scriptText,
      voiceName = 'Kore',
      speakerName = 'Aura',
      toneStyle = 'Atmospheric, cinematic, cultured historical tour guide',
    } = req.body;

    if (!scriptText || typeof scriptText !== 'string') {
      res.status(400).json({ error: 'Missing scriptText in request body.' });
      return;
    }

    // Limit narration chunk if overly long (to ensure responsive TTS delivery)
    const sanitizedScript = scriptText.slice(0, 1500);

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: sanitizedScript,
              speechMetadata: {
                speaker: speakerName,
                style: toneStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data received from gemini-3.8-flash-tts');
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voiceUsed: voiceName,
      modelUsed: 'gemini-3.8-flash-tts',
    });
  } catch (error: any) {
    console.error('Error in /api/landmark/narrate:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate speech with gemini-3.8-flash-tts',
    });
  }
});

// 5. Tourist Q&A with Search Grounding
app.post('/api/landmark/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const { landmarkName, question, historyContext } = req.body;

    if (!question || !landmarkName) {
      res.status(400).json({ error: 'Missing landmarkName or question parameter.' });
      return;
    }

    const promptText = `You are the AI Tour Guide for "${landmarkName}".
Context already known: ${historyContext ? historyContext.slice(0, 600) : ''}

Tourist's question: "${question}"

Provide a concise, engaging, factual answer (2-3 paragraphs) grounded in Google Search facts. Include interesting details and tips.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const answer = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web && chunk.web.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || 'Source reference',
        url: chunk.web.uri,
      }));

    res.json({
      success: true,
      answer,
      sources: Array.from(new Map(sources.map((s: any) => [s.url, s])).values()),
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/landmark/ask:', error);
    res.status(500).json({
      error: error?.message || 'Failed to answer question with search grounding',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    fs.existsSync(path.resolve(distPath, 'index.html'));

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `AuraSight AR server running on http://0.0.0.0:${PORT} (${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
