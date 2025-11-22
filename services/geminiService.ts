import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPost, Platform, UploadedImage } from "../types";

export class GeminiService {
  private client: GoogleGenAI;

  constructor() {
    // API Key must be available in process.env
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key not found in environment variables.");
    }
    this.client = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });
  }

  /**
   * Generates content for a specific platform based on images and text log.
   */
  async generatePlatformContent(
    platform: Platform,
    userLog: string,
    images: UploadedImage[],
    modelId: string,
    templatePrompt: string
  ): Promise<GeneratedPost> {
    
    // Prepare the structured output schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        selectedImageIndices: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: "The indices (0-based) of the uploaded images that best match this platform's aesthetic. Order matters (best first).",
        },
        content: {
          type: Type.STRING,
          description: "The main post caption/body text.",
        },
        hashtags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "5-10 relevant hashtags mixed with location and mood.",
        },
        reasoning: {
            type: Type.STRING,
            description: "Brief explanation of why these photos were chosen based on composition, color, and vibe."
        }
      },
      required: ["selectedImageIndices", "content", "hashtags"],
    };

    // Prepare prompt with advanced logic
    const prompt = `
      You are an expert Social Media Manager, Visual Director, and Photographer.
      
      TASK:
      Create a draft post for the platform: "${platform}".
      
      INPUTS:
      1. User's Travel Log: "${userLog}"
      2. Attached Images: I have attached ${images.length} images.
      
      STEP-BY-STEP EXECUTION PLAN (Internal Monologue):
      
      1. ADVANCED VISUAL ANALYSIS: 
         Mentally analyze each image for:
         - Content: What is happening?
         - Composition: Check for Rule of Thirds, Leading Lines, Symmetry, Depth, and Framing.
         - Color Palette: Identify dominant colors, saturation levels, and temperature (Warm/Cool).
         - Emotional Tone: Does it feel serene, chaotic, joyful, melancholic, or energetic?
      
      2. CONTEXT MATCHING:
         Analyze the User's Log and the Platform Template requirements.
      
      3. WEIGHTED SCORING SYSTEM (0-100):
         Score each image based on the following weighted criteria:
         - Content Relevance (30%): Does it visually represent the events/locations in the log?
         - Platform Vibe Match (30%): Does it fit the specific culture of "${platform}"? 
         - Visual Composition & Quality (20%): Is the photo well-composed (e.g., rule of thirds) and aesthetically pleasing?
         - Color & Emotional Harmony (20%): Do the colors and mood match the intended "Vibe" of the post?
      
      4. SELECTION & SEQUENCING:
         Select the highest-scoring images up to the platform limit.
         Sort them to create a compelling visual narrative (e.g., Hook -> Detail -> Atmosphere).
      
      5. COPYWRITING:
         Write the post content strictly following the template provided below.
      
      PLATFORM TEMPLATE & STYLE GUIDE:
      ${templatePrompt}
      
      REQUIREMENTS:
      1. Return the result strictly in JSON format matching the schema.
      2. Ensure the 'selectedImageIndices' array contains valid 0-based indices of the uploaded images.
      3. Language: Chinese/Mandarin (unless log is English).
    `;

    // Prepare content parts (Text + Images)
    const parts: any[] = [
      { text: prompt }
    ];

    // Add images to the payload
    // We map original index to the sent array to track selection later
    images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64
        }
      });
    });

    try {
      const response = await this.client.models.generateContent({
        model: modelId,
        contents: {
            role: 'user',
            parts: parts
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.7, 
        }
      });

      const jsonText = response.text;
      if (!jsonText) throw new Error("Empty response from Gemini");

      const parsed = JSON.parse(jsonText);

      // Map indices back to IDs
      const selectedIds = (parsed.selectedImageIndices || [])
        .map((idx: number) => images[idx]?.id)
        .filter((id: string | undefined) => id !== undefined);

      return {
        platform,
        content: parsed.content,
        hashtags: parsed.hashtags || [],
        selectedImageIds: selectedIds,
        reasoning: parsed.reasoning
      };

    } catch (error) {
      console.error(`Error generating content for ${platform}:`, error);
      throw new Error(`Failed to generate content for ${platform}`);
    }
  }
}