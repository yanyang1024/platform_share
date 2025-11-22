# Travel Agent Workflow AI

An AI-powered workflow agent designed for travel bloggers and social media managers. It takes raw travel photos and a rough text log, then uses Google Gemini to automatically analyze the visual composition of images, select the best shots, and write tailored copy for specific social media platforms (WeChat, Red/Xiaohongshu, Weibo, and Douyin).

## 🚀 Deployment

This is a client-side React application powered by Vite and the Google GenAI SDK.

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudio.google.com))

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory (or `.env.local`):
   ```env
   # The build tool (Vite) needs the variable prefixed, usually VITE_
   # However, the code uses process.env.API_KEY via a bundler replacement
   API_KEY=your_google_gemini_api_key_here
   ```

   *Note: Ensure your bundler (Vite/Webpack) is configured to define `process.env.API_KEY`.*

3. **Run the App**
   ```bash
   npm run dev
   ```

### Production Build

1. **Build the assets**
   ```bash
   npm run build
   ```
   This generates a `dist/` folder containing static files.

2. **Deploy**
   You can deploy the contents of the `dist/` folder to any static host:
   - Vercel / Netlify
   - GitHub Pages
   - AWS S3 / CloudFront
   - Nginx / Apache

---

## ⚙️ Configuration & Tuning

The core logic is divided between static constants and the Gemini Service prompt engineering.

### 1. Adjusting AI Models
To change which models appear in the dropdown menu:

*   **File:** `constants.ts`
*   **Variable:** `AVAILABLE_MODELS`

```typescript
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
  // Add your custom fine-tuned model or newer version here
];
```

### 2. Adjusting Image Selection Logic (Filtering)
The logic for how the AI selects images (based on composition, color, etc.) is defined within the prompt in the service layer.

*   **File:** `services/geminiService.ts`
*   **Method:** `generatePlatformContent`

**To tweak how strictly the AI filters images:**
Look for the `WEIGHTED SCORING SYSTEM` section in the prompt string. You can adjust the percentages to prioritize different factors:

```text
- Content Relevance (30%): Does it match the log?
- Platform Vibe Match (30%): Does it fit the specific app style?
- Visual Composition (20%): Rule of thirds, framing, etc.
- Color & Emotion (20%): Aesthetics.
```
*Example: If you want the AI to care more about photo quality than context, increase Visual Composition to 50%.*

### 3. Adjusting Text Generation
The writing style is controlled by **Templates**.
*   **Default Templates:** Defined in `constants.ts` under `PLATFORM_TEMPLATES`.
*   **Custom Templates:** Users can create these in the UI (saved to LocalStorage).

To change the *base instruction* for all generation (e.g., forcing a specific language or strict JSON adherence), edit the system instructions in `services/geminiService.ts`.

---

## 🛠️ Secondary & Extension Development

### Adding a New Platform (e.g., Instagram)

1.  **Update Types:**
    In `types.ts`, add the new platform to the Enum:
    ```typescript
    export enum Platform {
      // ... existing
      INSTAGRAM = 'Instagram'
    }
    ```

2.  **Update Configuration:**
    In `constants.ts`, add the config (icon, max photos):
    ```typescript
    [Platform.INSTAGRAM]: { 
      icon: '📸', 
      color: 'bg-pink-500',
      maxPhotos: 10 
    }
    ```

3.  **Add Templates:**
    In `constants.ts`, add default templates for the new platform:
    ```typescript
    [Platform.INSTAGRAM]: [
      {
        id: 'insta-caption',
        name: 'Aesthetic Caption',
        prompt: 'Short, punchy, lots of line breaks...'
      }
    ]
    ```

The UI in `App.tsx` will automatically render the new tab based on these constants.

### Improving Prompt Engineering
The current implementation uses a "Chain of Thought" approach (Analyze -> Score -> Select -> Write) in a single API call for efficiency.

**For advanced developers:**
You can split this into two separate API calls in `handleGenerate` inside `App.tsx`:
1.  **Call 1 (Vision):** Send images only. Ask AI to rate and tag them.
2.  **Logic:** Filter images in TypeScript based on the rating.
3.  **Call 2 (Text):** Send only the *selected* images + text log to generate the caption.

This consumes more tokens/latency but offers granular control over the selection process.

### Data Persistence
Currently, custom templates are saved in `localStorage`. To scale this:
1.  Replace `localStorage` calls in `App.tsx` with API calls to a backend database (Firebase, Supabase, PostgreSQL).
2.  Add user authentication to store data per user.

---

## License
MIT
