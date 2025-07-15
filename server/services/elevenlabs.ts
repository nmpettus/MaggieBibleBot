export interface CartoonVoice {
  voice_id: string;
  name: string;
  description: string;
  category: string;
}

// ElevenLabs Rachel voice for biblical guidance (using default available voice)
export const CARTOON_VOICES: CartoonVoice[] = [
  {
    voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel - ElevenLabs default voice
    name: "Rachel",
    description: "Gentle, faithful voice perfect for biblical guidance and cartoon characters",
    category: "faith-based"
  }
];

export async function generateSpeechElevenLabs(
  text: string, 
  voiceId: string = "21m00Tcm4TlvDq8ikWAM" // Default to Rachel voice
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.8, // More expressive/animated
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw new Error('Failed to generate speech with ElevenLabs');
  }
}

export async function getAvailableVoices(): Promise<any[]> {
  // Return only the Faith voice for now
  return CARTOON_VOICES;
}