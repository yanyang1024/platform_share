import { Platform, TemplateOption } from "./types";

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro (Reasoning)' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Images)' },
];

export const PLATFORM_CONFIGS: Record<Platform, { icon: string; color: string; maxPhotos: number }> = {
  [Platform.WECHAT]: { 
    icon: '💬', 
    color: 'bg-green-500',
    maxPhotos: 9 
  },
  [Platform.RED]: { 
    icon: '📕', 
    color: 'bg-red-500',
    maxPhotos: 9
  },
  [Platform.WEIBO]: { 
    icon: '👁️', 
    color: 'bg-yellow-500',
    maxPhotos: 9 
  },
  [Platform.DOUYIN]: { 
    icon: '🎵', 
    color: 'bg-black',
    maxPhotos: 12 
  }
};

export const PLATFORM_TEMPLATES: Record<Platform, TemplateOption[]> = {
  [Platform.WECHAT]: [
    {
      id: 'wechat-standard',
      name: 'Standard Moments (朋友圈)',
      prompt: `
        Style: Personal, intimate, slightly poetic or concise. Focus on "living in the moment".
        Format: Short paragraph, max 3-4 lines.
        Vibe: Casual, sharing with friends. Not too salesy.
        Emoji Usage: Moderate.
      `
    },
    {
      id: 'wechat-poetic',
      name: 'Poetic & Artsy (文艺)',
      prompt: `
        Style: Highly literary, emotional, abstract. Use metaphors.
        Format: Stanzas or broken lines like a poem.
        Vibe: Melancholic, awe-inspiring, or deep reflection.
        Emoji Usage: Minimal, only specific ones like 🌊, 🌙.
      `
    },
    {
      id: 'wechat-short',
      name: 'Minimalist/Cool (高冷)',
      prompt: `
        Style: Very short, cool, detached.
        Format: One sentence or just a few words.
        Vibe: "High cold" (Gao Leng), mysterious.
        Emoji Usage: None or strictly one.
      `
    }
  ],
  [Platform.RED]: [
    {
      id: 'red-standard',
      name: 'Standard Guide (攻略)',
      prompt: `
        Style: "Xiaohongshu" style. Enthusiastic, informative, sharing hidden gems.
        Format: Catchy title with emojis + structured body text with bullet points for tips/locations.
        Vibe: "Jimei" (Bestie) talk. Focus on visual aesthetics, practical tips, and location names.
        Emoji Usage: Heavy and decorative.
        Mandatory: Include specific location tags if detected.
      `
    },
    {
      id: 'red-vibe',
      name: 'Atmospheric Vibe (氛围感)',
      prompt: `
        Style: Focus on mood, color, feelings. Less info, more aesthetic description.
        Format: Short, evocative paragraphs.
        Vibe: Dreamy, cinematic, high-end.
        Emoji Usage: Aesthetic sparkles/stars (✨, 🕯️).
      `
    },
    {
      id: 'red-diary',
      name: 'Personal Diary (碎碎念)',
      prompt: `
        Style: First-person narrative, detailed storytelling, "Day in my life".
        Format: Narrative paragraph, conversational.
        Vibe: Authentic, relatable, warm.
        Emoji Usage: Moderate, used for expression.
      `
    }
  ],
  [Platform.WEIBO]: [
    {
      id: 'weibo-standard',
      name: 'Standard Microblog',
      prompt: `
        Style: News-like or micro-blogging. Trendy, discussing hot topics or sharing a mood.
        Format: Concise text.
        Vibe: Shareable, slightly more public facing.
        Emoji Usage: Standard Weibo emojis (doge, eating melon).
      `
    },
    {
      id: 'weibo-topic',
      name: 'Super Topic/Fan Style',
      prompt: `
        Style: Enthusiastic, community focused.
        Format: Starts with a Super Topic tag (e.g., #Travel#) and uses popular hashtags.
        Vibe: Hype and excitement.
      `
    },
    {
      id: 'weibo-emo',
      name: 'Late Night Emo (深夜EGM)',
      prompt: `
        Style: Emotional, reflective, slightly sad or nostalgic.
        Format: Short, sentimental text.
        Vibe: Late night thoughts.
      `
    }
  ],
  [Platform.DOUYIN]: [
    {
      id: 'douyin-standard',
      name: 'Carousel Hook',
      prompt: `
        Style: Catchy hook for a photo carousel video.
        Format: Very short, punchy text meant to be read quickly while scrolling.
        Vibe: High energy, algorithm-friendly.
        Emoji Usage: Impactful.
      `
    },
    {
      id: 'douyin-story',
      name: 'Visual Storytelling',
      prompt: `
        Style: Narration script for a video/slideshow.
        Format: Sequential storytelling, guiding the viewer through the photos.
        Vibe: Immersive, cinematic.
      `
    }
  ]
};