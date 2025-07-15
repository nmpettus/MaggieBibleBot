import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuestionSchema } from "@shared/schema";
import { askMaggieBibleQuestion } from "./services/openai";
import { generateSpeechElevenLabs, getAvailableVoices, CARTOON_VOICES } from "./services/elevenlabs";

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

  // Generate speech with ElevenLabs using Faith voice
  app.post("/api/generate-speech", async (req, res) => {
    try {
      const { text, voiceId } = req.body;
      
      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Use provided voice ID or default to Rachel
      const selectedVoiceId = voiceId || "21m00Tcm4TlvDq8ikWAM";
      
      const audioBuffer = await generateSpeechElevenLabs(text, selectedVoiceId);
      
      // Set appropriate headers for audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600'
      });
      
      res.send(Buffer.from(audioBuffer));
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ 
        message: "Failed to generate speech. Please try again!" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
