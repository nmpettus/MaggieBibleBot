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
      const { text } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log(`🔊 Speech generation request for: "${text.substring(0, 50)}..."`);
      
      // Always use Sara voice as primary
      const targetVoice = 'en-US-SaraNeural';
      console.log(`🎯 Using Sara voice: ${targetVoice}`);
      
      try {
        const azureAudioBuffer = await generateSpeechAzureTTS(text, targetVoice);
        
        console.log(`✅ Sara voice synthesis successful: ${azureAudioBuffer.byteLength} bytes`);
        
        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', azureAudioBuffer.byteLength.toString());
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Voice-Used', 'Sara');
        
        return res.send(azureAudioBuffer);
        
      } catch (azureError) {
        console.error(`⚠️ Sara voice failed: ${azureError.message}`);
        
        // Provide detailed error information
        if (azureError.message.includes('AZURE_SPEECH_KEY_MISSING')) {
          return res.status(500).json({ 
            message: "Azure Speech Service not configured - missing API key",
            error: "MISSING_API_KEY"
          });
        }
        
        if (azureError.message.includes('AZURE_SPEECH_REGION_MISSING')) {
          return res.status(500).json({ 
            message: "Azure Speech Service not configured - missing region",
            error: "MISSING_REGION"
          });
        }
        
        if (azureError.message.includes('AZURE_AUTH_FAILED')) {
          return res.status(500).json({ 
            message: "Azure Speech Service authentication failed - check your API key",
            error: "AUTH_FAILED"
          });
        }
        
        if (azureError.message.includes('AZURE_CONNECTION_FAILED')) {
          return res.status(500).json({ 
            message: "Azure Speech Service connection failed - check your region",
            error: "CONNECTION_FAILED"
          });
        }
        
        // Only use Samantha as absolute last resort
        try {
          console.warn(`🚨 EMERGENCY FALLBACK: Trying Samantha as last resort`);
          const emergencyBuffer = await generateSpeechAzureTTS(text, 'en-US-SamanthaNeural');
          
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', emergencyBuffer.byteLength.toString());
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('X-Voice-Used', 'Emergency Fallback');
          
          console.warn(`⚠️ Emergency Samantha succeeded: ${emergencyBuffer.byteLength} bytes`);
          return res.send(emergencyBuffer);
          
        } catch (emergencyError) {
          console.error(`💥 TOTAL FAILURE: Both Sara and emergency Samantha failed`);
          console.error(`   Sara error: ${azureError.message}`);
          console.error(`   Samantha error: ${emergencyError.message}`);
          
          return res.status(500).json({ 
            message: "All Azure voices failed. Please check your Azure Speech Service configuration.",
            error: "ALL_VOICES_FAILED",
            details: {
              sara: azureError.message,
              samantha: emergencyError.message
            }
          });
        }
      }
      
    } catch (error) {
      console.error("Error generating speech:", error);
      
      res.status(500).json({ 
        message: "Speech generation failed. Please check server configuration.",
        error: error.message,
        type: "GENERAL_ERROR"
      });
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
