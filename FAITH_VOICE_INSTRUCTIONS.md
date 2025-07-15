# Adding Faith Voice to ElevenLabs

## Current Status
- Faith voice is not available in your current ElevenLabs account
- The app is currently using Rachel voice as fallback
- You need to add Faith from the Voice Library to your "My Voices"

## Steps to Add Faith Voice:

### Option 1: From ElevenLabs Voice Library
1. Go to https://elevenlabs.io/voice-library
2. Search for "Faith" in the search bar
3. Click on the Faith voice when you find it
4. Click "Add to My Voices" button
5. The voice will be added to your account and available via API

### Option 2: If Faith is not in Voice Library
1. Go to https://elevenlabs.io/voice-library
2. Search for voices with similar characteristics:
   - "Gentle" voices
   - "Calm" voices  
   - "Soothing" voices
   - "Warm" voices
   - "Narrator" voices
3. Look for female voices suitable for biblical guidance
4. Add your preferred voice to "My Voices"

## Alternative Voice Recommendations:
If Faith is not available, here are good alternatives for biblical guidance:
- Alice (gentle, warm female voice)
- Lily (calm, soothing female voice)
- Grace (if available - perfect for biblical content)
- Any voice categorized as "Gentle", "Calm", or "Soothing"

## Technical Implementation:
Once you add Faith (or chosen alternative) to your account:
1. The voice will automatically appear in the app's voice selector
2. The app will auto-select Faith if found
3. If not found, it falls back to Rachel voice
4. You can manually select any available voice from the dropdown

## Current App Behavior:
- ✅ App searches for "Faith" voice first
- ✅ Falls back to Rachel if Faith not found
- ✅ Shows Faith with ✝️ symbol when available
- ✅ All ElevenLabs voices have premium quality vs browser voices