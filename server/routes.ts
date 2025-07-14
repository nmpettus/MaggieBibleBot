import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuestionSchema } from "@shared/schema";
import { askMaggieBibleQuestion } from "./services/openai";

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
        scriptureReferences: aiResponse.scriptureReferences
      });

      res.json({
        id: savedQuestion.id,
        question: savedQuestion.question,
        answer: savedQuestion.answer,
        scriptureReferences: savedQuestion.scriptureReferences,
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

  const httpServer = createServer(app);
  return httpServer;
}
