import { users, questions, type User, type InsertUser, type Question, type InsertQuestion } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveQuestion(question: InsertQuestion & { answer: string; scriptureReferences?: string }): Promise<Question>;
  getRecentQuestions(limit?: number): Promise<Question[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private currentUserId: number;
  private currentQuestionId: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.currentUserId = 1;
    this.currentQuestionId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveQuestion(questionData: InsertQuestion & { answer: string; scriptureReferences?: string }): Promise<Question> {
    const id = this.currentQuestionId++;
    const question: Question = {
      id,
      question: questionData.question,
      answer: questionData.answer,
      scriptureReferences: questionData.scriptureReferences || null,
      createdAt: new Date(),
    };
    this.questions.set(id, question);
    return question;
  }

  async getRecentQuestions(limit: number = 10): Promise<Question[]> {
    const allQuestions = Array.from(this.questions.values());
    return allQuestions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
