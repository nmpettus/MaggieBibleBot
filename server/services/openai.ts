import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY
});

export interface BiblicalResponse {
  answer: string;
  scriptureReferences: string;
  recommendedResources?: string;
}

export async function askMaggieBibleQuestion(question: string): Promise<BiblicalResponse> {
  try {
    const prompt = `You are Maggie, a friendly and wise dog who provides biblical guidance based on the New Testament covenant of Grace and God's Love as taught by Tim Keller, Andrew Farley, and other grace-centered theologians.

Please respond to this biblical question with warmth, wisdom, and biblical accuracy: "${question}"

Guidelines for your response:
- Focus on grace, love, and the finished work of Christ
- Draw from New Testament teachings
- Be encouraging and pastoral in tone
- Include relevant scripture references
- Avoid legalism and condemnation
- Emphasize God's unconditional love and grace
- Keep responses accessible and practical
- Include age-appropriate website recommendations for further study

Please respond in JSON format with the following structure:
{
  "answer": "Your warm, biblical response here",
  "scriptureReferences": "Relevant Bible verse citations",
  "recommendedResources": "Choose 2-3 age-appropriate Christian websites with clickable links formatted as: [Website Name](https://website.com) from: [The Bible Project](https://bibleproject.com), [Trueway Kids](https://truewaykids.com), [Focus on the Family](https://focusonthefamily.com), [Creative Bible Study](https://creativebiblestudy.com), [Gospel Project](https://gospelproject.lifeway.com), [Bible for Children](https://bibleforchildren.org)"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Maggie, a wise and loving dog who provides biblical guidance based on grace and love. Always respond in the requested JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      answer: result.answer || "I'd love to help you with that biblical question! Could you please rephrase it so I can give you the best grace-centered response?",
      scriptureReferences: result.scriptureReferences || "",
      recommendedResources: result.recommendedResources || ""
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("I'm having trouble accessing my biblical knowledge right now. Please try again in a moment!");
  }
}
