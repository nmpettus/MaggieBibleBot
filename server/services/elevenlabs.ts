export interface CartoonVoice {
  voice_id: string;
  name: string;
  description: string;
  category: string;
}

// Faith voice for biblical guidance from user's ElevenLabs account
export const CARTOON_VOICES: CartoonVoice[] = [
  {
    voice_id: "bIQlQ61Q7WgbyZAL7IWj", // Faith - User's ElevenLabs voice
    name: "Faith",
    description: "Faith voice from ElevenLabs - perfect for biblical guidance and cartoon characters",
    category: "faith-based"
  }
];

export async function generateSpeechElevenLabs(
  text: string, 
  voiceId: string = "bIQlQ61Q7WgbyZAL7IWj" // Default to Faith voice
): Promise<ArrayBuffer> {
  try {
    // Optimize text length for faster generation
    const maxLength = 800; // Shorter text = faster generation
    const optimizedText = text.length > maxLength ? 
      text.substring(0, maxLength).split('.').slice(0, -1).join('.') + '.' : text;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      body: JSON.stringify({
        text: optimizedText,
        model_id: "eleven_turbo_v2", // Faster turbo model for speed
        voice_settings: {
          stability: 0.7, // Slightly higher for consistency
          similarity_boost: 0.75, // Good balance of quality/speed
          style: 0.3, // Lower style for faster generation
          use_speaker_boost: true
        },
        output_format: "mp3_22050_32" // Lower quality for faster streaming
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
  try {
    // Try to fetch voices from ElevenLabs API
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const voices = data.voices || [];
      
      // Look for Faith voice specifically and prioritize it
      const faithVoice = voices.find((v: any) => v.name.toLowerCase() === 'faith');
      const allAvailableVoices = voices.map((v: any) => ({
        voice_id: v.voice_id,
        name: v.name,
        description: v.description || `${v.name} voice from ElevenLabs`,
        category: v.category || 'general'
      }));
      
      if (faithVoice) {
        // Put Faith voice first in the list
        const faithVoiceFormatted = {
          voice_id: faithVoice.voice_id,
          name: faithVoice.name,
          description: 'Faith voice from ElevenLabs - perfect for biblical guidance',
          category: 'faith-based'
        };
        
        // Return Faith first, then other voices
        const otherVoices = allAvailableVoices.filter(v => v.name.toLowerCase() !== 'faith');
        return [faithVoiceFormatted, ...otherVoices];
      }
      
      // Return all available voices if Faith not found
      return allAvailableVoices;
    }
    
    // Fallback to Rachel if API fails
    return CARTOON_VOICES;
  } catch (error) {
    console.error('Error fetching ElevenLabs voices (likely permission issue):', error);
    console.log('Note: Faith voice should be manually configured with correct voice_id');
    return CARTOON_VOICES;
  }
}