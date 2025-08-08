import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuestionSchema } from "@shared/schema";
import { askMaggieBibleQuestion } from "./services/openai";
import { generateSpeechGoogleTTS, getGoogleTTSVoices } from "./services/googleTTS";
import { generateSpeechAzureTTS, getAzureTTSVoices } from "./services/azureTTS";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ask Maggie a Bible question
  app.post("/api/ask-maggie", async (req, res) => {
    try {
      const { question } = insertQuestionSchema.parse(req.body);
      
      if (!question || question.trim().length < 5) {
        return res.status(400).json({ 
          message: "Please ask a more detailed biblical question so I can give you a thoughtful response!" 
        });
      }

      // Get AI response from OpenAI
      const aiResponse = await askMaggieBibleQuestion(question);
      
      // Save the question and response
      const savedQuestion = await storage.saveQuestion({
        question: question.trim(),
        answer: aiResponse.answer,
        scriptureReferences: aiResponse.scriptureReferences,
        recommendedResources: aiResponse.recommendedResources
      });

      res.json({
        id: savedQuestion.id,
        question: savedQuestion.question,
        answer: savedQuestion.answer,
        scriptureReferences: savedQuestion.scriptureReferences,
        recommendedResources: savedQuestion.recommendedResources,
        createdAt: savedQuestion.createdAt
      });
    } catch (error) {
      console.error("Error asking Maggie:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "I'm having trouble right now. Please try asking your question again!" 
      });
    }
  });

  // Get recent questions (optional for future use)
  app.get("/api/recent-questions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const questions = await storage.getRecentQuestions(limit);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching recent questions:", error);
      res.status(500).json({ message: "Unable to fetch recent questions" });
    }
  });

  // Get available Azure childlike voices for testing
  app.get("/api/azure-voices", async (req, res) => {
    try {
      const { getAzureTTSVoices, AZURE_CHILDLIKE_VOICES } = await import("./services/azureTTS.js");
      res.json({ voices: AZURE_CHILDLIKE_VOICES });
    } catch (error) {
      console.error("Error fetching Azure voices:", error);
      res.status(500).json({ message: "Failed to get Azure voices" });
    }
  });

  // Test specific Azure voice
  app.post("/api/test-azure-voice", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      
      if (!text || !voiceName) {
        return res.status(400).json({ message: "Text and voiceName are required" });
      }

      const { generateSpeechAzureTTS } = await import("./services/azureTTS.js");
      const azureBuffer = await generateSpeechAzureTTS(text, voiceName);
      
      if (azureBuffer && azureBuffer.length > 0) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', azureBuffer.length.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Voice-Used', `Azure ${voiceName.split('-')[2]?.replace('Neural', '')}`);
        
        console.log(`✅ Azure voice test succeeded: ${voiceName}`);
        return res.send(azureBuffer);
      }
      
      throw new Error("Azure TTS failed to generate audio");
      
    } catch (error) {
      console.error("Azure voice test error:", error);
      res.status(500).json({ message: "Failed to test Azure voice", error: error.message });
    }
  });

  // Generate speech with ElevenLabs Faith voice and Azure TTS fallback
  app.post("/api/generate-speech", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use Azure TTS as primary service
      try {
        console.log(`🔊 Using Azure TTS genuine child voice`);
        
        // Always use Sara voice
        const azureVoice = 'en-US-SaraNeural';
        const azureAudioBuffer = await generateSpeechAzureTTS(text, azureVoice);
        
        console.log(`📦 Azure buffer type: ${typeof azureAudioBuffer}, length: ${azureAudioBuffer?.byteLength || 'undefined'}`);
        
        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', azureAudioBuffer.byteLength.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Voice-Used', 'Azure Sara');
        
        console.log(`✅ Azure TTS succeeded: ${azureAudioBuffer.byteLength} bytes`);
        console.log(`🎯 Setting voice header: Azure Sara`);
        return res.send(azureAudioBuffer);
        
      } catch (azureError) {
        if (azureError.message === 'AZURE_NOT_CONFIGURED' || 
            azureError.message === 'AZURE_INVALID_REGION') {
          console.log(`⚠️ Azure TTS not configured`);
        } else {
          console.log(`⚠️ Azure TTS failed: ${azureError.message}`);
        }
        
        const azureMsg = azureError.message === 'AZURE_NOT_CONFIGURED' ? 'Not configured' : 
                        azureError.message === 'AZURE_INVALID_REGION' ? 'Invalid region' : 
                        azureError.message;
        throw new Error(`Azure TTS service failed: ${azureMsg}`);
      }
      
    } catch (error) {
      console.error("Error generating speech:", error);
      
      // Handle specific errors
      if (error.message.includes('Not configured') || 
                 error.message.includes('Invalid region')) {
        res.status(500).json({ 
          message: "Azure voice service needs proper configuration. Using enhanced browser voice.",
          fallback: true,
          needsSetup: true
        });
      } else {
        res.status(500).json({ 
          message: "Azure voice service temporarily unavailable. Using enhanced browser voice.",
          fallback: true 
        });
      }
    }
  });

  // Get Azure TTS voices
  app.get("/api/azure-voices", async (req, res) => {
    try {
      const voices = await getAzureTTSVoices();
      res.json({ voices });
    } catch (error) {
      console.error("Error fetching Azure TTS voices:", error);
      res.status(500).json({ message: "Unable to fetch Azure TTS voices" });
    }
  });

  // Test endpoint for voice header debugging
  app.post("/api/test-voice-header", (req, res) => {
    res.setHeader('X-Voice-Used', 'Test Voice');
    res.setHeader('Content-Type', 'application/json');
    console.log('🧪 Test endpoint - headers set:', res.getHeaders());
    res.json({ message: 'Voice header test', headers: res.getHeaders() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
