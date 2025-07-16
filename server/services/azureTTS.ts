import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface AzureTTSVoice {
  name: string;
  displayName: string;
  gender: string;
  locale: string;
  age: string;
  description: string;
}

// High-quality childlike female voices from Azure
export const AZURE_CHILDLIKE_VOICES: AzureTTSVoice[] = [
  {
    name: "en-US-JennyNeural",
    displayName: "Jenny",
    gender: "Female",
    locale: "en-US",
    age: "Young Adult",
    description: "Warm, friendly, perfect for children's content"
  },
  {
    name: "en-US-AriaNeural", 
    displayName: "Aria",
    gender: "Female",
    locale: "en-US",
    age: "Young Adult",
    description: "Clear, natural, childlike quality"
  },
  {
    name: "en-US-SaraNeural",
    displayName: "Sara",
    gender: "Female", 
    locale: "en-US",
    age: "Child",
    description: "Youthful, engaging voice for kids"
  }
];

export async function generateSpeechAzureTTS(
  text: string,
  voiceName: string = "en-US-JennyNeural"
): Promise<Buffer> {
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    throw new Error("Azure Speech Service credentials not configured");
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
  
  // Set endpoint (this might be needed for proper connection)
  speechConfig.endpointId = undefined; // Use default endpoint
  
  // Use SSML for better voice control
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voiceName}">
        <prosody rate="0.85" pitch="+10%">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;

  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();
        
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const audioBuffer = Buffer.from(result.audioData);
          resolve(audioBuffer);
        } else {
          reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
        }
      },
      (error) => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${error}`));
      }
    );
  });
}

export async function getAzureTTSVoices(): Promise<AzureTTSVoice[]> {
  // Return our curated list of child-friendly voices
  return AZURE_CHILDLIKE_VOICES;
}