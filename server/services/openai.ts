import OpenAI from "openai";

// Bible verse database for immediate lookup
const BIBLE_VERSES = {
  "Genesis 29:18-28": "And Jacob loved Rachel; and said, I will serve thee seven years for Rachel thy younger daughter. And Laban said, It is better that I give her to thee, than that I should give her to another man: abide with me. And Jacob served seven years for Rachel; and they seemed unto him but a few days, for the love he had to her. And Jacob said unto Laban, Give me my wife, for my days are fulfilled, that I may go in unto her. And Laban gathered together all the men of the place, and made a feast. And it came to pass in the evening, that he took Leah his daughter, and brought her to him; and he went in unto her. And Laban gave unto his daughter Leah Zilpah his maid for an handmaid. And it came to pass, that in the morning, behold, it was Leah: and he said to Laban, What is this thou hast done unto me? did not I serve with thee for Rachel? wherefore then hast thou beguiled me? And Laban said, It must not be so done in our country, to give the younger before the firstborn. Fulfil her week, and we will give thee this also for the service which thou shalt serve with me yet seven other years. And Jacob did so, and fulfilled her week: and he gave him Rachel his daughter to wife also.",
  "Romans 6:14": "For sin shall not have dominion over you: for ye are not under the law, but under grace.",
  "Hebrews 3:3": "For this man was counted worthy of more glory than Moses, inasmuch as he who hath builded the house hath more honour than the house.",
  "Romans 9:10-13": "And not only this; but when Rebecca also had conceived by one, even by our father Isaac; (For the children being not yet born, neither having done any good or evil, that the purpose of God according to election might stand, not of works, but of him that calleth;) It was said unto her, The elder shall serve the younger. As it is written, Jacob have I loved, but Esau have I hated.",
  "1 Kings 3:9-12": "Give therefore thy servant an understanding heart to judge thy people, that I may discern between good and bad: for who is able to judge this thy so great a people? And the speech pleased the Lord, that Solomon had asked this thing. And God said unto him, Because thou hast asked this thing, and hast not asked for thyself long life; neither hast asked riches for thyself, nor hast asked the life of thine enemies; but hast asked for thyself understanding to discern judgment; Behold, I have done according to thy words: lo, I have given thee a wise and an understanding heart; so that there was none like thee before thee, neither after thee shall any arise like unto thee.",
  "John 3:16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  "Romans 8:28": "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  "Philippians 4:13": "I can do all things through Christ which strengtheneth me.",
  "Jeremiah 29:11": "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.",
  "Psalm 23:1": "The Lord is my shepherd; I shall not want.",
  "Isaiah 41:10": "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
  "Matthew 28:20": "Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you always, even unto the end of the world. Amen.",
  "2 Timothy 3:16": "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:",
  "Proverbs 3:5-6": "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  "1 Corinthians 13:4-7": "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things."
};

// Function to get Bible verse text
function getBibleVerse(reference: string): string | null {
  // Clean the reference
  const cleanRef = reference.replace(/["""]/g, '').trim();
  
  // Direct lookup
  if (BIBLE_VERSES[cleanRef]) {
    return BIBLE_VERSES[cleanRef];
  }
  
  // Try variations
  const variations = [
    cleanRef.replace(/\s+/g, ' '),
    cleanRef.replace(/(\d+)\s+(\w+)/g, '$1 $2'),
    cleanRef.replace(/(\w+)\s+(\d+)/g, '$1 $2')
  ];
  
  for (const variation of variations) {
    if (BIBLE_VERSES[variation]) {
      return BIBLE_VERSES[variation];
    }
  }
  
  return null;
}

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

CRITICAL INSTRUCTIONS:
- Focus on grace, love, and the finished work of Christ
- Include age-appropriate website recommendations for further study
- When you mention a Bible verse reference, you MUST include the full verse text immediately after the reference
- NEVER say "Please look up this verse" or "Read this passage" - ALWAYS include the complete verse text
- Format Bible references like this: "Romans 6:14 - 'For sin shall not have dominion over you: for ye are not under the law, but under grace.'"
- If you don't know a verse text, don't mention that verse reference at all

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

    let result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Post-process the answer to include Bible verse texts
    if (result.answer) {
      // Find Bible references in the answer and replace with full verses
      result.answer = result.answer.replace(
        /"([^"]*(?:\d+\s*\w+\s*\d+[:\-\d]*[^"]*))"/g,
        (match, reference) => {
          const verseText = getBibleVerse(reference);
          if (verseText) {
            return `"${reference}" - "${verseText}"`;
          }
          return match;
        }
      );
      
      // Also handle references without quotes
      result.answer = result.answer.replace(
        /\b(\d+\s+\w+\s+\d+[:\-\d]*)\b(?!\s*-\s*")/g,
        (match, reference) => {
          const verseText = getBibleVerse(reference);
          if (verseText) {
            return `${reference} - "${verseText}"`;
          }
          return match;
        }
      );
      
      // Remove any remaining "Please look up" phrases
      result.answer = result.answer.replace(
        /[.\s]*Please look up this verse[^.!?]*[.!?]/gi,
        ''
      );
      result.answer = result.answer.replace(
        /[.\s]*This is a wonderful passage[^.!?]*[.!?]/gi,
        ''
      );
    }
    
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
