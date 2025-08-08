import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface AzureTTSVoice {
  name: string;
  displayName: string;
  gender: string;
  locale: string;
  age: string;
  description: string;
}

// High-quality childlike female voices from Azure (ordered by youthfulness)
export const AZURE_CHILDLIKE_VOICES: AzureTTSVoice[] = [
  {
    name: "en-US-SaraNeural",
    displayName: "Sara",
    gender: "Female", 
    locale: "en-US",
    age: "Child",
    description: "Genuine child voice - most youthful option"
  },
  {
    name: "en-US-SamanthaNeural",
    displayName: "Samantha",
    gender: "Female",
    locale: "en-US",
    age: "Young Adult",
    description: "Fallback voice when Sara is unavailable"
  }
];

export async function generateSpeechAzureTTS(
  text: string,
  voiceName: string = 'en-US-SaraNeural'
): Promise<Buffer> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  console.log(`🔊 Azure TTS: Generating speech with ${voiceName} in region ${speechRegion}`);

  if (!speechKey || speechKey.trim() === '' || speechKey === 'your_azure_speech_key_here' || speechKey.startsWith('#') ||
      !speechRegion || speechRegion.trim() === '' || speechRegion === 'your_azure_region_here' || speechRegion.startsWith('#')) {
    console.error('⚠️ Azure Speech Service not configured properly');
    throw new Error("AZURE_NOT_CONFIGURED");
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
  
  // Optimized SSML for Sara's child voice
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voiceName}">
        <prosody rate="0.85" pitch="+8%">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  console.log(`🎵 Synthesizing with ${voiceName}...`);

  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();
        
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const audioBuffer = Buffer.from(result.audioData);
          console.log(`✅ SUCCESS: ${voiceName} generated ${audioBuffer.length} bytes`);
          resolve(audioBuffer);
        } else {
          console.error(`❌ SYNTHESIS FAILED for ${voiceName}: ${result.errorDetails}`);
          if (result.errorDetails && result.errorDetails.includes('404')) {
            reject(new Error('AZURE_INVALID_REGION'));
          } else {
            reject(new Error(`SYNTHESIS_ERROR: ${result.errorDetails}`));
          }
        }
      },
      (error) => {
        synthesizer.close();
        console.log(`⚠️ ${voiceName} connection error: ${error}`);
        if (error.includes('404') || error.includes('your_azure_region_here')) {
          reject(new Error('INVALID_REGION'));
        } else {
          reject(new Error(`CONNECTION_ERROR: ${error}`));
        }
      }
    );
  });
}

export async function getAzureTTSVoices(): Promise<AzureTTSVoice[]> {
  // Return our curated list of child-friendly voices
  return AZURE_CHILDLIKE_VOICES;
}