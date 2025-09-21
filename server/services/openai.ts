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

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    // Validate API key before instantiating OpenAI client
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here' || process.env.OPENAI_API_KEY.startsWith('sk-proj-your-actual')) {
      throw new Error("OpenAI API key is not properly configured. Please set a valid OPENAI_API_KEY in your environment variables.");
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

export interface BiblicalResponse {
  answer: string;
  scriptureReferences: string;
  recommendedResources?: string;
}

export async function askMaggieBibleQuestion(question: string): Promise<BiblicalResponse> {
  try {
    // Get AI-generated resource recommendations based on the specific question
    const resourceRecommendations = await generateResourceRecommendations(question);

    const openaiClient = getOpenAIClient();

    const prompt = `You are Maggie, a friendly and wise dog who provides biblical guidance based on the New Testament covenant of Grace and God's Love as taught by Tim Keller, Andrew Farley, and other grace-centered theologians.

Please respond to this biblical question with warmth, wisdom, and biblical accuracy: "${question}"

ABSOLUTE REQUIREMENTS - NEVER VIOLATE THESE:
1. NEVER EVER say "Please look up this verse" or "Read this passage" or "This is a wonderful passage"
2. NEVER tell users to look up verses themselves
3. If you mention a Bible verse, you MUST include the complete text
4. If you don't know the verse text, DO NOT mention that verse at all
5. Focus on grace, love, and the finished work of Christ
6. Format like: "Romans 6:14 - 'For sin shall not have dominion over you: for ye are not under the law, but under grace.'"

FORBIDDEN PHRASES (NEVER USE):
- "Please look up"
- "Read this passage" 
- "This is a wonderful passage"
- "Check your Bible"
- "You can find this in"

Please respond in JSON format with the following structure:
{
  "answer": "Your warm, biblical response here",
  "scriptureReferences": "Relevant Bible verse citations",
  "recommendedResources": "${resourceRecommendations}"
}`;

    const response = await openaiClient.chat.completions.create({
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
    
    // NUCLEAR OPTION: Remove ALL variations of "Please look up" and similar phrases
    if (result.answer) {
      // Remove "Please look up" in all forms
      result.answer = result.answer.replace(
        /[^.!?]*Please look up[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "This is a wonderful passage"
      result.answer = result.answer.replace(
        /[^.!?]*This is a wonderful passage[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "Read this passage"
      result.answer = result.answer.replace(
        /[^.!?]*Read this passage[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "Check your Bible"
      result.answer = result.answer.replace(
        /[^.!?]*Check your Bible[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "You can find this in"
      result.answer = result.answer.replace(
        /[^.!?]*You can find this in[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "Look up this verse"
      result.answer = result.answer.replace(
        /[^.!?]*Look up this verse[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "Please read"
      result.answer = result.answer.replace(
        /[^.!?]*Please read[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "I encourage you to read"
      result.answer = result.answer.replace(
        /[^.!?]*I encourage you to read[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove "Take a look at"
      result.answer = result.answer.replace(
        /[^.!?]*Take a look at[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove any sentence that contains "look" + "verse" or "passage"
      result.answer = result.answer.replace(
        /[^.!?]*\b(look|read|check|find)\b[^.!?]*\b(verse|passage|scripture|Bible)\b[^.!?]*[.!?]?/gi,
        ''
      );
      
      // Remove quotes around verse references that don't have verse text
      result.answer = result.answer.replace(
        /"([^"]*\d+[:\-\d]*[^"]*)"(?!\s*-\s*")/g,
        '$1'
      );
      
      // Remove any remaining fragments that start with common lookup phrases
      result.answer = result.answer.replace(
        /\b(Please|I encourage|Take a|You can|Check|Look|Read)\s+[^.!?]*\b(verse|passage|scripture|Bible)\b[^.!?]*[.!?]?/gi,
        ''
      );
      
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

      // Clean up any double spaces or awkward formatting
      result.answer = result.answer.replace(/\s+/g, ' ').trim();
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

async function generateResourceRecommendations(question: string): Promise<string> {
  try {
    // Analyze the question to determine the topic category
    const questionLower = question.toLowerCase();
    
    // Topic-based resource mapping with high-quality, specific links
    let resources = "";
    
    if (questionLower.includes("god") && (questionLower.includes("mad") || questionLower.includes("angry") || questionLower.includes("upset"))) {
      resources = "[Is God Mad at Me? - Focus on the Family](https://www.focusonthefamily.com/parenting/is-god-mad-at-me/), [God's Love and Anger - Bible Project](https://bibleproject.com/explore/video/god/), [Understanding God's Character - Crosswalk Kids](https://www.crosswalk.com/family/parenting/kids/understanding-gods-character-for-kids.html)";
    }
    else if (questionLower.includes("sin") || questionLower.includes("forgive") || questionLower.includes("salvation")) {
      resources = "[What is Sin? - Kids Answers](https://answersingenesis.org/kids/sin/what-is-sin/), [God's Forgiveness - Bible for Children](https://www.bibleforchildren.org/PDFs/english/The_Lost_Son_English.pdf), [How to Be Saved - Gospel Project Kids](https://gospelproject.lifeway.com/kids/)";
    }
    else if (questionLower.includes("pray") || questionLower.includes("prayer")) {
      resources = "[How to Pray - Focus on the Family](https://www.focusonthefamily.com/parenting/teaching-kids-to-pray/), [Prayer for Kids - Crosswalk](https://www.crosswalk.com/family/parenting/kids/teaching-children-to-pray.html), [Kids Prayer Guide - Christianity.com](https://www.christianity.com/wiki/prayer/how-to-teach-kids-to-pray.html)";
    }
    else if (questionLower.includes("jesus") || questionLower.includes("christ")) {
      resources = "[Who is Jesus? - Bible Project](https://bibleproject.com/explore/jesus/), [Jesus for Kids - Crosswalk](https://www.crosswalk.com/family/parenting/kids/who-is-jesus-explaining-christ-to-children.html), [Life of Jesus - Bible for Children](https://www.bibleforchildren.org/languages/english/stories.php)";
    }
    else if (questionLower.includes("heaven") || questionLower.includes("eternal") || questionLower.includes("afterlife")) {
      resources = "[What is Heaven Like? - Focus on the Family](https://www.focusonthefamily.com/parenting/what-is-heaven-like/), [Heaven for Kids - Crosswalk](https://www.crosswalk.com/family/parenting/kids/explaining-heaven-to-children.html), [Eternal Life - Kids Answers](https://answersingenesis.org/kids/heaven/)";
    }
    else if (questionLower.includes("bible") || questionLower.includes("scripture") || questionLower.includes("word")) {
      resources = "[Why Trust the Bible? - Bible Project](https://bibleproject.com/explore/how-to-read-the-bible/), [Bible for Kids - Crosswalk](https://www.crosswalk.com/family/parenting/kids/teaching-kids-about-the-bible.html), [Scripture Memory - Hide God's Word](https://www.hidegodswordinmyheart.com/)";
    }
    else if (questionLower.includes("love") || questionLower.includes("relationship")) {
      resources = "[God's Love - Focus on the Family](https://www.focusonthefamily.com/parenting/gods-love-for-children/), [God Loves Me - Bible for Children](https://www.bibleforchildren.org/PDFs/english/God_So_Loved_the_World_English.pdf), [Understanding God's Love - Crosswalk Kids](https://www.crosswalk.com/family/parenting/kids/gods-love-for-children.html)";
    }
    else if (questionLower.includes("fear") || questionLower.includes("afraid") || questionLower.includes("worry")) {
      resources = "[When Kids Are Afraid - Focus on the Family](https://www.focusonthefamily.com/parenting/when-children-are-afraid/), [God's Protection - Bible Project](https://bibleproject.com/explore/psalms/), [Overcoming Fear - Crosswalk Kids](https://www.crosswalk.com/family/parenting/kids/helping-kids-overcome-fear.html)";
    }
    else if (questionLower.includes("creation") || questionLower.includes("world") || questionLower.includes("made")) {
      resources = "[Creation Story - Bible for Children](https://www.bibleforchildren.org/PDFs/english/In_the_Beginning_English.pdf), [God Made Everything - Kids Answers](https://answersingenesis.org/kids/creation/), [Creation for Kids - Focus on the Family](https://www.focusonthefamily.com/parenting/teaching-kids-about-creation/)";
    }
    else if (questionLower.includes("obey") || questionLower.includes("commandment") || questionLower.includes("rules")) {
      resources = "[Why Obey God? - Focus on the Family](https://www.focusonthefamily.com/parenting/teaching-kids-obedience/), [God's Rules - Crosswalk Kids](https://www.crosswalk.com/family/parenting/kids/teaching-children-gods-commandments.html), [Ten Commandments for Kids - Bible for Children](https://www.bibleforchildren.org/PDFs/english/Moses_and_the_Law_English.pdf)";
    }
    else {
      // General biblical questions - use AI to generate specific resources
      const resourcePrompt = `Based on this biblical question: "${question}"

Provide 3 specific, high-quality Christian website resources that directly address this question. Use REAL, working URLs from these trusted sites:

TRUSTED SITES WITH SPECIFIC SECTIONS:
- focusonthefamily.com/parenting/ (family questions, tough topics)
- crosswalk.com/family/parenting/kids/ (kids' Christian topics)
- bibleproject.com/explore/ (Bible themes, stories, theology)
- answersingenesis.org/kids/ (creation, Bible questions for kids)
- christianity.com/wiki/ (Christian topics explained)
- gotquestions.org/kids/ (Bible questions answered)
- bibleforchildren.org (Bible stories and lessons)

Format as: [Descriptive Title - Site Name](https://full-url)

Make titles descriptive and specific to the question. Use real URLs that would logically exist on these sites.

Respond with only 3 markdown links, separated by commas.`;

      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that finds relevant Christian educational resources. Respond only with 3 specific markdown links."
          },
          {
            role: "user",
            content: resourcePrompt
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      resources = response.choices[0].message.content?.trim() || "";
    }

    // Fallback if AI doesn't provide good resources
    if (!resources || resources.length < 20) {
      return "[Bible Questions Answered - Got Questions](https://www.gotquestions.org/kids/), [Christian Parenting - Focus on the Family](https://www.focusonthefamily.com/parenting/), [Bible Stories for Kids - Bible for Children](https://www.bibleforchildren.org/languages/english/stories.php)";
    }
    
    return resources;
    
  } catch (error) {
    console.error("Error generating resource recommendations:", error);
    // Fallback resources
    return "[Bible Questions Answered - Got Questions](https://www.gotquestions.org/kids/), [Christian Parenting - Focus on the Family](https://www.focusonthefamily.com/parenting/), [Bible Stories for Kids - Bible for Children](https://www.bibleforchildren.org/languages/english/stories.php)";
  }
}