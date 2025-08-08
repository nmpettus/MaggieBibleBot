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
    description: "Emergency fallback voice only"
  }
];

export async function generateSpeechAzureTTS(
  text: string,
  voiceName: string = 'en-US-SaraNeural'
): Promise<Buffer> {
  console.log(`🔊 Azure TTS: Starting speech generation with ${voiceName}`);
  
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  console.log(`🔑 Azure Config Check:`);
  console.log(`   Speech Key: ${speechKey ? 'SET (' + speechKey.substring(0, 8) + '...)' : 'NOT SET'}`);
  console.log(`   Speech Region: ${speechRegion || 'NOT SET'}`);

  // Check if Azure is properly configured
  if (!speechKey || speechKey.trim() === '' || speechKey === 'your_azure_speech_key_here' || speechKey.startsWith('#')) {
    console.error('❌ AZURE_SPEECH_KEY is not configured properly');
    throw new Error("AZURE_SPEECH_KEY_MISSING");
  }

  if (!speechRegion || speechRegion.trim() === '' || speechRegion === 'your_azure_region_here' || speechRegion.startsWith('#')) {
    console.error('❌ AZURE_SPEECH_REGION is not configured properly');
    throw new Error("AZURE_SPEECH_REGION_MISSING");
  }

  try {
    console.log(`🎵 Creating speech config for region: ${speechRegion}`);
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    
    // Optimized SSML for Sara's child voice
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="0.85" pitch="+3%">
            ${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim()}
            <break time="500ms"/>
          </prosody>
        </voice>
      </speak>
    `;

    console.log(`🎤 Synthesizing with ${voiceName}...`);

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
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            console.error(`❌ SYNTHESIS CANCELED for ${voiceName}:`);
            console.error(`   Reason: ${cancellation.reason}`);
            console.error(`   Error Code: ${cancellation.errorCode}`);
            console.error(`   Error Details: ${cancellation.errorDetails}`);
            
            if (cancellation.errorCode === sdk.CancellationErrorCode.ConnectionFailure) {
              reject(new Error('AZURE_CONNECTION_FAILED'));
            } else if (cancellation.errorCode === sdk.CancellationErrorCode.AuthenticationFailure) {
              reject(new Error('AZURE_AUTH_FAILED'));
            } else {
              reject(new Error(`SYNTHESIS_CANCELED: ${cancellation.errorDetails}`));
            }
          } else {
            console.error(`❌ SYNTHESIS FAILED for ${voiceName}: ${result.errorDetails}`);
            reject(new Error(`SYNTHESIS_ERROR: ${result.errorDetails}`));
          }
        },
        (error) => {
          synthesizer.close();
          console.error(`💥 ${voiceName} synthesis error:`, error);
          reject(new Error(`SYNTHESIS_EXCEPTION: ${error}`));
        }
      );
    });
  } catch (error) {
    console.error(`💥 Azure TTS setup error:`, error);
    throw new Error(`AZURE_SETUP_ERROR: ${error.message}`);
  }
}

export async function getAzureTTSVoices(): Promise<AzureTTSVoice[]> {
  return AZURE_CHILDLIKE_VOICES;
}