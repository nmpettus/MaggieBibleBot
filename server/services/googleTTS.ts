import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export interface GoogleTTSVoice {
  name: string;
  displayName: string;
  gender: string;
  languageCode: string;
  naturalness: number;
  description: string;
}

// Best natural childlike female voices for biblical guidance
export const CHILDLIKE_FEMALE_VOICES: GoogleTTSVoice[] = [
  {
    name: 'en-US-Journey-F',
    displayName: 'Journey (Female)',
    gender: 'FEMALE',
    languageCode: 'en-US',
    naturalness: 10,
    description: 'Most natural, warm, and childlike female voice'
  },
  {
    name: 'en-US-Wavenet-F',
    displayName: 'WaveNet Female',
    gender: 'FEMALE', 
    languageCode: 'en-US',
    naturalness: 9,
    description: 'High-quality neural voice with youthful tone'
  },
  {
    name: 'en-US-Wavenet-E',
    displayName: 'WaveNet Emma',
    gender: 'FEMALE',
    languageCode: 'en-US',
    naturalness: 9,
    description: 'Clear, friendly female voice suitable for children'
  },
  {
    name: 'en-US-Neural2-F',
    displayName: 'Neural2 Female',
    gender: 'FEMALE',
    languageCode: 'en-US',
    naturalness: 8,
    description: 'Advanced neural voice with natural intonation'
  },
  {
    name: 'en-US-Standard-E',
    displayName: 'Standard Emma',
    gender: 'FEMALE',
    languageCode: 'en-US',
    naturalness: 7,
    description: 'Reliable standard voice, good for biblical content'
  }
];

export async function generateSpeechGoogleTTS(
  text: string,
  voiceName: string = 'en-US-Journey-F'
): Promise<Buffer> {
  try {
    console.log(`🔊 Generating speech with Google TTS voice: ${voiceName}`);
    
    // Initialize client (will use service account key from environment)
    const client = new TextToSpeechClient();
    
    // Find the selected voice
    const selectedVoice = CHILDLIKE_FEMALE_VOICES.find(v => v.name === voiceName) || CHILDLIKE_FEMALE_VOICES[0];
    
    // Configure request for natural childlike speech
    const request = {
      input: { text },
      voice: {
        languageCode: selectedVoice.languageCode,
        name: selectedVoice.name,
        ssmlGender: selectedVoice.gender as 'MALE' | 'FEMALE' | 'NEUTRAL'
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        // Child-optimized settings
        speakingRate: 0.85, // Slightly slower for clarity
        pitch: 2.0, // Higher pitch for childlike voice
        volumeGainDb: 0.0,
        effectsProfileId: ['headphone-class-device'], // Better audio quality
        sampleRateHertz: 24000
      }
    };
    
    console.log(`📝 Request config: ${selectedVoice.displayName}, pitch: ${request.audioConfig.pitch}, rate: ${request.audioConfig.speakingRate}`);
    
    // Generate speech
    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content received from Google TTS');
    }
    
    const audioBuffer = Buffer.from(response.audioContent);
    console.log(`✅ Google TTS generated ${audioBuffer.length} bytes of audio`);
    
    return audioBuffer;
    
  } catch (error) {
    console.error('Google TTS error:', error);
    
    // Provide specific error information
    if (error.code === 'UNAUTHENTICATED') {
      throw new Error('GOOGLE_AUTH_ERROR');
    } else if (error.code === 'QUOTA_EXCEEDED') {
      throw new Error('GOOGLE_QUOTA_EXCEEDED');
    } else if (error.code === 'INVALID_ARGUMENT') {
      throw new Error('GOOGLE_INVALID_VOICE');
    } else {
      throw new Error('GOOGLE_TTS_ERROR');
    }
  }
}

export async function getGoogleTTSVoices(): Promise<GoogleTTSVoice[]> {
  return CHILDLIKE_FEMALE_VOICES;
}