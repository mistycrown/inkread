
import { AppSettings, AIStructuredData } from '../types';
import { GoogleGenAI, Type, Schema } from "@google/genai";

const DEFAULT_PROMPT = `You are a knowledge assistant. Process the following raw text and user notes.
1. Extract the Source Platform Name (e.g., Bilibili, WeChat, RedNote, YouTube, Website) if identifiable.
2. Extract the Primary URL if present.
3. Generate a concise Title in Simplified Chinese.
4. Generate a Summary (max 3 sentences) in Simplified Chinese.
5. Extract up to 5 relevant Tags.`;

// Gemini Response Schema
const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A concise title for the content in Simplified Chinese.',
    },
    summary: {
      type: Type.STRING,
      description: 'A brief summary of the content (max 3 sentences) in Simplified Chinese.',
    },
    tags: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'Up to 5 relevant tags.',
    },
    source: {
      type: Type.STRING,
      description: 'The name of the source platform (e.g. Bilibili, RedNote).',
      nullable: true
    },
    link: {
      type: Type.STRING,
      description: 'The primary external link found in the content.',
      nullable: true
    }
  },
  required: ["title", "summary", "tags"],
};

export const analyzeText = async (
  text: string, 
  userNote: string, 
  settings: AppSettings,
  promptContent?: string // Now passed explicitly
): Promise<AIStructuredData> => {
  
  // 1. Check if Custom OpenAI settings are provided. If so, use them (Legacy/Custom Mode)
  if (settings.openai_api_key && settings.openai_base_url) {
    return analyzeWithCustomOpenAI(text, userNote, settings, promptContent);
  }

  // 2. Default: Use Google Gemini with environment API Key
  return analyzeWithGemini(text, userNote, settings, promptContent);
};

const analyzeWithGemini = async (
    text: string, 
    userNote: string, 
    settings: AppSettings, 
    promptContent?: string
): Promise<AIStructuredData> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Use passed prompt or fallback to default
    // We append the core requirement (Source/Link/Chinese) to ensure user templates don't break functionality
    const userPrompt = promptContent && promptContent.trim().length > 0
      ? promptContent
      : "You are a knowledge assistant.";
      
    const systemInstruction = `${userPrompt}
    
    CRITICAL REQUIREMENTS:
    - Output Title and Summary in Simplified Chinese (简体中文).
    - Extract Source Platform and Link if available.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Raw Text:\n${text.slice(0, 10000)}` }, // Increase limit for Gemini
            { text: `User Notes:\n${userNote}` }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIStructuredData;
    } else {
      throw new Error("Gemini returned empty response");
    }

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    throw new Error(`Gemini Error: ${error.message || "Unknown error"}`);
  }
};

const analyzeWithCustomOpenAI = async (
    text: string, 
    userNote: string, 
    settings: AppSettings,
    promptContent?: string
): Promise<AIStructuredData> => {
  const baseUrl = settings.openai_base_url 
    ? settings.openai_base_url.replace(/\/$/, '') 
    : 'https://api.openai.com/v1';
    
  const model = settings.openai_model || "gpt-3.5-turbo";
  
  const baseInstruction = promptContent && promptContent.trim().length > 0
    ? promptContent
    : DEFAULT_PROMPT;

  const systemPrompt = `
    ${baseInstruction}
    
    IMPORTANT: You must return the result strictly as a valid JSON object.
    Output Title and Summary in Simplified Chinese.
    The JSON structure must be:
    {
      "title": "string (Chinese)",
      "summary": "string (Chinese)",
      "tags": ["string"],
      "source": "string (optional)",
      "link": "string (optional URL)"
    }
  `;

  const userContent = `
    Raw Text:
    ${text.slice(0, 3000)} 

    User Notes:
    ${userNote}
  `;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openai_api_key}`
        },
        body: JSON.stringify({
        model: model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ],
        temperature: 0.5
        })
    });

    if (!response.ok) {
        throw new Error(`Custom API Request Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
        throw new Error("Empty response from OpenAI");
    }

    // Attempt to extract JSON if wrapped in markdown code blocks
    let jsonStr = content;
    if (content.includes("```json")) {
        jsonStr = content.split("```json")[1].split("```")[0];
    } else if (content.includes("```")) {
        jsonStr = content.split("```")[1].split("```")[0];
    }

    return JSON.parse(jsonStr.trim());

  } catch (error: any) {
      console.error("Custom OpenAI Error:", error);
      throw new Error(`OpenAI Error: ${error.message || "Check API Key/Url"}`);
  }
};

export const testOpenAIConnection = async (settings: AppSettings): Promise<string> => {
    const baseUrl = settings.openai_base_url
      ? settings.openai_base_url.replace(/\/$/, '')
      : 'https://api.openai.com/v1';
  
    if (!settings.openai_api_key) throw new Error("Missing API Key");

    const model = settings.openai_model || "gpt-3.5-turbo";

    try {
      // We try a minimal chat completion request to verify authentication and model access
      const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.openai_api_key}`
          },
          body: JSON.stringify({
              model: model,
              messages: [{ role: "user", content: "Ping" }],
              max_tokens: 1
          })
      });
  
      if (!response.ok) {
        // Try to read the error body
        const errText = await response.text();
        throw new Error(`Status ${response.status}: ${errText.slice(0, 100)}`);
      }
      
      return "Connection Successful!";
    } catch (e: any) {
      throw new Error(e.message || "Connection Failed");
    }
  };
