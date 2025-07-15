import * as ElevenLabs from "elevenlabs";

export interface CartoonVoice {
  voice_id: string;
  name: string;
  description: string;
  category: string;
}

// Curated list of cartoon-friendly voices for Maggie with Faith as the top choice
export const CARTOON_VOICES: CartoonVoice[] = [
  {
    voice_id: "XrExE9yKIg1WjnnlVkGX", // Faith - perfect for biblical guidance
    name: "Faith",
    description: "Gentle, faithful voice perfect for biblical guidance and cartoon characters",
    category: "faith-based"
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL", // Bella - young female voice
    name: "Bella", 
    description: "Sweet, youthful female voice ideal for animated characters",
    category: "childlike"
  },
  {
    voice_id: "pNInz6obpgDQGcFmaJgB", // Adam - young male voice
    name: "Adam",
    description: "Young, energetic voice perfect for cartoon characters",
    category: "childlike"
  },
  {
    voice_id: "AZnzlk1XvdvUeBnXmlld", // Domi - energetic voice
    name: "Domi",
    description: "Playful, animated voice great for cartoon dogs",
    category: "energetic"
  },
  {
    voice_id: "ErXwobaYiN019PkySvjV", // Antoni - warm voice
    name: "Antoni",
    description: "Warm, friendly voice suitable for gentle characters", 
    category: "friendly"
  }
];

export async function generateSpeechElevenLabs(
  text: string, 
  voiceId: string = "XrExE9yKIg1WjnnlVkGX" // Default to Faith for biblical guidance
): Promise<ArrayBuffer> {
  try {
    const audio = await ElevenLabs.generate({
      voice: voiceId,
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.8, // More expressive/animated
        use_speaker_boost: true
      }
    });

    // Convert the audio stream to ArrayBuffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw new Error('Failed to generate speech with ElevenLabs');
  }
}

export async function getAvailableVoices(): Promise<any[]> {
  try {
    const response = await ElevenLabs.getVoices();
    return response.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return CARTOON_VOICES;
  }
}