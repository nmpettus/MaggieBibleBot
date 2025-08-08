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
    // Analyze the question to determine topic for smart resource recommendations
    const questionLower = question.toLowerCase();
    let resourceRecommendations = "";
    
    if (questionLower.includes('salvation') || questionLower.includes('saved') || questionLower.includes('gospel') || questionLower.includes('eternal life')) {
      resourceRecommendations = "[Gospel Project for Kids](https://gospelproject.lifeway.com/kids/), [Bible for Children - Salvation Stories](https://bibleforchildren.org/languages/english/stories/nt/salvation)";
    } else if (questionLower.includes('bible story') || questionLower.includes('character') || questionLower.includes('david') || questionLower.includes('moses') || questionLower.includes('noah')) {
      resourceRecommendations = "[The Bible Project - Bible Stories](https://bibleproject.com/explore/video/), [Trueway Kids - Bible Characters](https://truewaykids.com/bible-characters/)";
    } else if (questionLower.includes('prayer') || questionLower.includes('worship') || questionLower.includes('praise')) {
      resourceRecommendations = "[Focus on the Family - Prayer for Kids](https://focusonthefamily.com/parenting/age-appropriate-chores/prayer-for-kids/), [Creative Bible Study - Prayer Activities](https://creativebiblestudy.com/prayer-activities-for-kids/)";
    } else if (questionLower.includes('family') || questionLower.includes('parent') || questionLower.includes('relationship') || questionLower.includes('love')) {
      resourceRecommendations = "[Focus on the Family - Christian Parenting](https://focusonthefamily.com/parenting/), [Trueway Kids - Family Devotions](https://truewaykids.com/family-devotions/)";
    } else if (questionLower.includes('god') && (questionLower.includes('love') || questionLower.includes('care'))) {
      resourceRecommendations = "[Bible for Children - God's Love Stories](https://bibleforchildren.org/languages/english/stories/), [The Bible Project - God's Character](https://bibleproject.com/explore/god/)";
    } else if (questionLower.includes('difficult') || questionLower.includes('hard') || questionLower.includes('understand') || questionLower.includes('why')) {
      resourceRecommendations = "[Creative Bible Study - Tough Questions](https://creativebiblestudy.com/tough-bible-questions/), [Focus on the Family - Answering Kids' Questions](https://focusonthefamily.com/parenting/answering-kids-tough-questions/)";
    } else {
      // Default recommendations for general questions
      resourceRecommendations = "[The Bible Project - Bible Overview](https://bibleproject.com/explore/), [Trueway Kids - Bible Lessons](https://truewaykids.com/bible-lessons/)";
    }

    const prompt = `You are Maggie, a friendly and wise dog who provides biblical guidance based on the New Testament covenant of Grace and God's Love as taught by Tim Keller, Andrew Farley, and other grace-centered theologians.

Please respond to this biblical question with warmth, wisdom, and biblical accuracy: "${question}"

- Focus on grace, love, and the finished work of Christ
- Include age-appropriate website recommendations for further study

Please respond in JSON format with the following structure:
{
  "answer": "Your warm, biblical response here",
  "scriptureReferences": "Relevant Bible verse citations",
  "recommendedResources": "${resourceRecommendations}"
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
