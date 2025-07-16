import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuestionSchema } from "@shared/schema";
import { askMaggieBibleQuestion } from "./services/openai";
import { generateSpeechElevenLabs, getAvailableVoices, CARTOON_VOICES } from "./services/elevenlabs";
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

  // Get ElevenLabs cartoon voices for Maggie with Faith as priority
  app.get("/api/cartoon-voices", async (req, res) => {
    try {
      const voices = await getAvailableVoices();
      
      // Filter for child-friendly and cartoon voices including Faith
      const cartoonVoices = voices.filter(voice => 
        voice.category === 'generated' || 
        voice.name.toLowerCase().includes('child') ||
        voice.name.toLowerCase().includes('young') ||
        voice.name.toLowerCase().includes('faith') ||
        voice.labels?.age === 'young' ||
        voice.labels?.gender === 'female'
      ).slice(0, 10);

      // Combine with our curated list (Faith first)
      const allVoices = [...CARTOON_VOICES, ...cartoonVoices];

      res.json({ voices: allVoices });
    } catch (error) {
      console.error("Error fetching cartoon voices:", error);
      // Fallback to curated list with Faith
      res.json({ voices: CARTOON_VOICES });
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

      // First, try ElevenLabs Faith voice
      try {
        const selectedVoiceId = voiceId || "bIQlQ61Q7WgbyZAL7IWj";
        console.log(`🎤 Attempting Faith voice (ElevenLabs): ${selectedVoiceId}`);
        
        const audioBuffer = await generateSpeechElevenLabs(text, selectedVoiceId);
        
        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.byteLength.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Voice-Used', 'Faith');
        
        console.log(`✅ Faith voice succeeded: ${audioBuffer.byteLength} bytes`);
        console.log(`🎯 Setting voice header: Faith`);
        return res.send(Buffer.from(audioBuffer));
        
      } catch (elevenLabsError) {
        console.log(`⚠️ Faith voice failed: ${elevenLabsError.message}`);
        
        // If ElevenLabs fails, try Azure TTS as premium fallback
        try {
          console.log(`🔊 Falling back to Azure TTS genuine child voice`);
          
          // Allow voice switching via environment variable (default: Jenny)
          const azureVoice = process.env.AZURE_VOICE || 'en-US-JennyNeural';
          const azureAudioBuffer = await generateSpeechAzureTTS(text, azureVoice);
          
          // Extract voice name for display
          const voiceName = azureVoice.includes('Sara') ? 'Sara' : 
                           azureVoice.includes('Aria') ? 'Aria' :
                           azureVoice.includes('Ana') ? 'Ana' :
                           azureVoice.includes('Emma') ? 'Emma' :
                           azureVoice.includes('Jenny') ? 'Jenny' : 'Jenny';
          
          console.log(`📦 Azure buffer type: ${typeof azureAudioBuffer}, length: ${azureAudioBuffer?.byteLength || 'undefined'}`);
          
          // Set appropriate headers for audio response
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', azureAudioBuffer.byteLength.toString());
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Voice-Used', `Azure ${voiceName}`);
          
          console.log(`✅ Azure TTS succeeded: ${azureAudioBuffer.byteLength} bytes`);
          console.log(`🎯 Setting voice header: Azure ${voiceName}`);
          console.log(`📋 Response headers before send:`, res.getHeaders());
          return res.send(azureAudioBuffer);
          
        } catch (azureError) {
          console.log(`⚠️ Azure TTS also failed: ${azureError.message}`);
          
          // Both premium services failed - return error
          throw new Error(`Both premium TTS services failed: ${elevenLabsError.message}, ${azureError.message}`);
        }
      }
      
    } catch (error) {
      console.error("Error generating speech:", error);
      
      // Handle specific errors
      if (error.message === 'QUOTA_EXCEEDED') {
        res.status(429).json({ 
          message: "Faith voice quota exceeded. Using enhanced browser voice.",
          quotaExceeded: true
        });
      } else if (error.message === 'AZURE_AUTH_ERROR') {
        res.status(500).json({ 
          message: "Premium voice services need setup. Using enhanced browser voice.",
          fallback: true 
        });
      } else {
        res.status(500).json({ 
          message: "Premium voice services temporarily unavailable. Using enhanced browser voice.",
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
