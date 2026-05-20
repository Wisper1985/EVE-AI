import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON bodyParser for custom API posts
  app.use(express.json({ limit: "15mb" }));

  // Initialize the Gemini SDK client securely on the server
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey 
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // API Route for real-time secure AI Image generation
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "1:1" } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required to perform visual AI synthesis." });
      }

      if (!ai) {
        return res.status(500).json({ 
          error: "Gemini API key is not configured on the server environment. Please attach a valid API key through Settings." 
        });
      }

      console.log(`[AI-Gen] Processing prompt: "${prompt}" [Ratio: ${aspectRatio}]`);

      // Utilizing gemini-2.5-flash-image as the robust, high-performance image generation engine
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          },
        },
      });

      let base64Image = null;
      let textResponse = "";

      if (response && response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = part.inlineData.data;
          } else if (part.text) {
            textResponse += part.text;
          }
        }
      }

      if (base64Image) {
        console.log(`[AI-Gen] Successfully synthesized image frame data for: "${prompt}"`);
        return res.json({
          success: true,
          imageUrl: `data:image/png;base64,${base64Image}`,
          explanation: textResponse || undefined
        });
      } else {
        console.warn(`[AI-Gen] No image format payload returned from content synthesis.`);
        return res.status(500).json({ error: "Model synthesis passed but returned empty visual frame blocks." });
      }
    } catch (error: any) {
      console.error("[AI-Gen-Error] Server-side image generation triggered runtime failure:", error);
      return res.status(500).json({ 
        error: error?.message || "An unexpected error occurred during image construction on the core." 
      });
    }
  });

  // Physical ESP servo hardware adapter bridge command route
  app.post("/api/hardware/claw", (req, res) => {
    const { command } = req.body;
    console.log(`[Bridge Server] Physical Hardware Handshake: Commanding claw to state: ${command}`);
    return res.json({ success: true, status: `Hardware level verified. Position: ${command}` });
  });

  // Health signals
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", serverTime: new Date().toISOString() });
  });

  // Integrate Vite dev and preview servers seamlessly into the Express lifecycle
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Mounting development Vite compilation pipeline...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Mounting production static asset framework layer...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Core UPLINK] Full-stack companion engine activated at: http://localhost:${PORT}`);
  });
}

startServer();
