export enum Platform {
  WECHAT = 'WeChat Moments',
  RED = 'Xiaohongshu (Red)',
  WEIBO = 'Weibo',
  DOUYIN = 'Douyin/TikTok'
}

export interface TemplateOption {
  id: string;
  name: string;
  prompt: string;
  isCustom?: boolean;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string; // Pure base64 data without prefix for API
  mimeType: string;
}

export interface GeneratedPost {
  platform: Platform;
  content: string;
  hashtags: string[];
  selectedImageIds: string[]; // IDs of the images selected by AI
  reasoning?: string; // Why AI chose these photos
}

export interface AgentState {
  isProcessing: boolean;
  currentStep: string;
  error: string | null;
}

export interface GenerationConfig {
  model: string;
  tone: 'Casual' | 'Professional' | 'Poetic' | 'Humorous';
}

export interface ProcessingResult {
  [key: string]: GeneratedPost; // Keyed by Platform enum
}