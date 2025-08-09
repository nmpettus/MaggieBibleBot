import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Send, Volume2, VolumeX, Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Popular Bible verses for the popup system
const BIBLE_VERSES = [
  // Genesis
  { reference: "Genesis 1:1", text: "In the beginning God created the heavens and the earth." },
  { reference: "Genesis 1:27", text: "So God created mankind in his own image, in the image of God he created them; male and female he created them." },
  { reference: "Genesis 3:15", text: "And I will put enmity between you and the woman, and between your offspring and hers; he will crush your head, and you will strike his heel." },
  { reference: "Genesis 8:22", text: "As long as the earth endures, seedtime and harvest, cold and heat, summer and winter, day and night will never cease." },
  { reference: "Genesis 12:3", text: "I will bless those who bless you, and whoever curses you I will curse; and all peoples on earth will be blessed through you." },
  { reference: "Genesis 28:15", text: "I am with you and will watch over you wherever you go, and I will bring you back to this land. I will not leave you until I have done what I have promised you." },
  { reference: "Genesis 50:20", text: "You intended to harm me, but God intended it for good to accomplish what is now being done, the saving of many lives." },
  
  // Exodus
  { reference: "Exodus 3:14", text: "God said to Moses, 'I AM WHO I AM. This is what you are to say to the Israelites: I AM has sent me to you.'" },
  { reference: "Exodus 14:14", text: "The Lord will fight for you; you need only to be still." },
  { reference: "Exodus 20:3", text: "You shall have no other gods before me." },
  { reference: "Exodus 33:14", text: "The Lord replied, 'My Presence will go with you, and I will give you rest.'" },
  
  // Deuteronomy
  { reference: "Deuteronomy 6:5", text: "Love the Lord your God with all your heart and with all your soul and with all your strength." },
  { reference: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you." },
  { reference: "Deuteronomy 31:8", text: "The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged." },
  
  // Joshua
  { reference: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go." },
  { reference: "Joshua 24:15", text: "But as for me and my household, we will serve the Lord." },
  
  // Psalms
  { reference: "Psalm 1:1-2", text: "Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers, but whose delight is in the law of the Lord, and who meditates on his law day and night." },
  { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { reference: "Psalm 23:4", text: "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
  { reference: "Psalm 27:1", text: "The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?" },
  { reference: "Psalm 34:18", text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit." },
  { reference: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { reference: "Psalm 91:1-2", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty. I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'" },
  { reference: "Psalm 103:12", text: "As far as the east is from the west, so far has he removed our transgressions from us." },
  { reference: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path." },
  { reference: "Psalm 121:1-2", text: "I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth." },
  { reference: "Psalm 139:14", text: "I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well." },
  
  // Proverbs
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { reference: "Proverbs 22:6", text: "Start children off on the way they should go, and even when they are old they will not turn from it." },
  { reference: "Proverbs 27:17", text: "As iron sharpens iron, so one person sharpens another." },
  
  // Isaiah
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { reference: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." },
  { reference: "Isaiah 53:5", text: "But he was pierced for our transgressions, he was crushed for our iniquities; the punishment that brought us peace was on him, and by his wounds we are healed." },
  { reference: "Isaiah 55:8-9", text: "For my thoughts are not your thoughts, neither are your ways my ways, declares the Lord. As the heavens are higher than the earth, so are my ways higher than your ways and my thoughts than your thoughts." },
  
  // Jeremiah
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
  { reference: "Jeremiah 31:3", text: "The Lord appeared to us in the past, saying: I have loved you with an everlasting love; I have drawn you with unfailing kindness." },
  
  // Matthew
  { reference: "Matthew 5:3", text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven." },
  { reference: "Matthew 5:4", text: "Blessed are those who mourn, for they will be comforted." },
  { reference: "Matthew 5:16", text: "In the same way, let your light shine before others, that they may see your good deeds and glorify your Father in heaven." },
  { reference: "Matthew 6:26", text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?" },
  { reference: "Matthew 6:33", text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { reference: "Matthew 22:37-39", text: "Jesus replied: 'Love the Lord your God with all your heart and with all your soul and with all your mind.' This is the first and greatest commandment. And the second is like it: 'Love your neighbor as yourself.'" },
  { reference: "Matthew 28:19-20", text: "Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, and teaching them to obey everything I have commanded you. And surely I am with you always, to the very end of the age." },
  { reference: "Matthew 28:20", text: "And surely I am with you always, to the very end of the age." },
  
  // Mark
  { reference: "Mark 16:15", text: "He said to them, 'Go into all the world and preach the gospel to all creation.'" },
  
  // Luke
  { reference: "Luke 6:31", text: "Do to others as you would have them do to you." },
  { reference: "Luke 19:10", text: "For the Son of Man came to seek and to save the lost." },
  
  // John
  { reference: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
  { reference: "John 1:12", text: "Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God." },
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { reference: "John 8:32", text: "Then you will know the truth, and the truth will set you free." },
  { reference: "John 10:10", text: "The thief comes only to steal and kill and destroy; I have come that they may have life, and have it to the full." },
  { reference: "John 14:6", text: "Jesus answered, 'I am the way and the truth and the life. No one comes to the Father except through me.'" },
  { reference: "John 15:13", text: "Greater love has no one than this: to lay down one's life for one's friends." },
  
  // Acts
  { reference: "Acts 1:8", text: "But you will receive power when the Holy Spirit comes on you; and you will be my witnesses in Jerusalem, and in all Judea and Samaria, and to the ends of the earth." },
  { reference: "Acts 16:31", text: "They replied, 'Believe in the Lord Jesus, and you will be saved—you and your household.'" },
  
  // Romans
  { reference: "Romans 3:23", text: "For all have sinned and fall short of the glory of God." },
  { reference: "Romans 5:8", text: "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us." },
  { reference: "Romans 6:23", text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord." },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { reference: "Romans 8:38-39", text: "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord." },
  { reference: "Romans 10:9", text: "If you declare with your mouth, 'Jesus is Lord,' and believe in your heart that God raised him from the dead, you will be saved." },
  { reference: "Romans 12:2", text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God's will is—his good, pleasing and perfect will." },
  
  // 1 Corinthians
  { reference: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear. But when you are tempted, he will also provide a way out so that you can endure it." },
  { reference: "1 Corinthians 13:4-5", text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud. It does not dishonor others, it is not self-seeking, it is not easily angered, it keeps no record of wrongs." },
  { reference: "1 Corinthians 13:13", text: "And now these three remain: faith, hope and love. But the greatest of these is love." },
  
  // 2 Corinthians
  { reference: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
  { reference: "2 Corinthians 12:9", text: "But he said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.' Therefore I will boast all the more gladly about my weaknesses, so that Christ's power may rest on me." },
  
  // Galatians
  { reference: "Galatians 2:20", text: "I have been crucified with Christ and I no longer live, but Christ lives in me. The life I now live in the body, I live by faith in the Son of God, who loved me and gave himself for me." },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control. Against such things there is no law." },
  
  // Ephesians
  { reference: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." },
  { reference: "Ephesians 4:32", text: "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you." },
  { reference: "Ephesians 6:10", text: "Finally, be strong in the Lord and in his mighty power." },
  
  // Philippians
  { reference: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { reference: "Philippians 4:19", text: "And my God will meet all your needs according to the riches of his glory in Christ Jesus." },
  
  // Colossians
  { reference: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
  
  // 1 Thessalonians
  { reference: "1 Thessalonians 5:16-18", text: "Rejoice always, pray continually, give thanks in all circumstances; for this is God's will for you in Christ Jesus." },
  
  // 2 Timothy
  { reference: "2 Timothy 1:7", text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline." },
  { reference: "2 Timothy 3:16", text: "All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness." },
  
  // Hebrews
  { reference: "Hebrews 11:1", text: "Now faith is confidence in what we hope for and assurance about what we do not see." },
  { reference: "Hebrews 13:5", text: "Keep your lives free from the love of money and be content with what you have, because God has said, 'Never will I leave you; never will I forsake you.'" },
  
  // James
  { reference: "James 1:2-3", text: "Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance." },
  { reference: "James 4:8", text: "Come near to God and he will come near to you. Wash your hands, you sinners, and purify your hearts, you double-minded." },
  
  // 1 Peter
  { reference: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you." },
  
  // 1 John
  { reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just and will forgive us our sins and purify us from all unrighteousness." },
  { reference: "1 John 4:8", text: "Whoever does not love does not know God, because God is love." },
  { reference: "1 John 4:16", text: "And so we know and rely on the love God has for us. God is love. Whoever lives in love lives in God, and God in them." },
  { reference: "1 John 4:19", text: "We love because he first loved us." },
  
  // Revelation
  { reference: "Revelation 21:4", text: "He will wipe every tear from their eyes. There will be no more death or mourning or crying or pain, for the old order of things has passed away." }
];

// Dynamic Bible verse lookup function
const lookupBibleVerse = async (reference: string) => {
  console.log(`🔍 Looking up verse: ${reference}`);
  setLoadingVerse(reference);
  
  try {
    const response = await fetch(`/api/bible-verse/${encodeURIComponent(reference)}`);
    
    if (response.ok) {
      const verse = await response.json();
      console.log(`✅ Found verse:`, verse);
      
      setSelectedVerse({
        reference: verse.reference,
        text: verse.text
      });
    } else {
      console.log(`❌ Verse not found: ${reference}`);
      setSelectedVerse({
        reference: reference,
        text: `Sorry, I couldn't find the text for ${reference}. This verse may not be available in our current Bible translation or the reference format might need adjustment.`
      });
    }
  } catch (error) {
    console.error(`💥 Error looking up verse ${reference}:`, error);
    setSelectedVerse({
      reference: reference,
      text: `I'm having trouble looking up ${reference} right now. Please try again in a moment.`
    });
  } finally {
    setLoadingVerse(null);
  }
};

interface BiblicalResponse {
  id: number;
  question: string;
  answer: string;
  scriptureReferences: string;
  recommendedResources?: string;
  createdAt: string;
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<BiblicalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [words, setWords] = useState<string[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<{reference: string, text: string} | null>(null);
  const [loadingVerse, setLoadingVerse] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout[]>([]);
  const { toast } = useToast();

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Auto-submit after 2 seconds of silence
  useEffect(() => {
    if (transcript && !listening && transcript.trim().length > 0) {
      const timer = setTimeout(() => {
        setQuestion(transcript);
        resetTranscript();
        handleSubmit(new Event('submit') as any, transcript);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [transcript, listening]);

  const startListening = () => {
    if (!browserSupportsSpeechRecognition) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support speech recognition. Please type your question instead.",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    resetTranscript();
    SpeechRecognition.startListening({ 
      continuous: true,
      language: 'en-US'
    });
  };

  const stopListening = () => {
    setIsListening(false);
    SpeechRecognition.stopListening();
  };

  // Dynamic scripture lookup function
  const lookupScripture = async (reference: string): Promise<{reference: string, text: string} | null> => {
    try {
      setLoadingVerse(true);
      
      // Clean and normalize the reference
      const cleanRef = reference.trim().replace(/[^\w\s:-]/g, '');
      
      // Use Bible API to fetch the verse
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(cleanRef)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.text && data.reference) {
          return {
            reference: data.reference,
            text: data.text.trim()
          };
        }
      }
      
      // Fallback to alternative API
      const altResponse = await fetch(`https://labs.bible.org/api/?passage=${encodeURIComponent(cleanRef)}&type=json`);
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        
        if (altData && altData[0] && altData[0].text) {
          return {
            reference: `${altData[0].bookname} ${altData[0].chapter}:${altData[0].verse}`,
            text: altData[0].text.trim()
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Scripture lookup error:', error);
      return null;
    } finally {
      setLoadingVerse(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, voiceQuestion?: string) => {
    e.preventDefault();
    const questionToSubmit = voiceQuestion || question;
    
    if (!questionToSubmit.trim()) {
      toast({
        title: "Please ask a question",
        description: "I'd love to help you with a biblical question!",
        variant: "destructive",
      });
      return;
    }

    if (questionToSubmit.trim().length < 5) {
      toast({
        title: "Please be more specific",
        description: "Could you ask a more detailed question so I can give you a thoughtful biblical response?",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);
    stopAudio();

    try {
      const res = await fetch('/api/ask-maggie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: questionToSubmit }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data: BiblicalResponse = await res.json();
      setResponse(data);
      setQuestion('');
      
      console.log('✅ Got response, will auto-play Sara voice');

    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Oops! Something went wrong",
        description: error instanceof Error ? error.message : "I'm having trouble right now. Please try again!",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearHighlightTimeouts = () => {
    highlightTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    highlightTimeoutRef.current = [];
  };

  const playAudio = async (text: string) => {
    console.log('🔊 PLAY AUDIO CALLED with text:', text.substring(0, 50) + '...');
    console.log('📝 Full text length:', text.length, 'characters');
    console.log('📝 Text ends with:', text.slice(-50));
    
    try {
      // Stop any existing audio first
      stopAudio();
      
      console.log('🎵 Requesting Sara voice from Azure TTS...');
      
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text,
          voiceName: 'en-US-SaraNeural'
        }),
      });

      console.log('📡 Speech API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Speech API failed:', errorText);
        throw new Error(`Speech generation failed: ${response.status} - ${errorText}`);
      }

      const voiceUsed = response.headers.get('X-Voice-Used');
      console.log('🎵 Voice used from header:', voiceUsed);

      const audioBlob = await response.blob();
      console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio blob');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎵 Created audio URL:', audioUrl);
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Prepare words for highlighting
      const textWords = text.split(/\s+/).filter(word => word.length > 0);
      setWords(textWords);
      setCurrentWordIndex(-1);
      
      console.log('🎯 Prepared', textWords.length, 'words for highlighting');

      // Set up audio event handlers
      audio.onloadeddata = () => {
        console.log('🎵 Audio loaded, duration:', audio.duration, 'seconds');
        console.log('📊 Expected speech time for', textWords.length, 'words:', (textWords.length / 160 * 60).toFixed(1), 'seconds');
        setIsPlaying(true);
        setIsPaused(false);
        
        // Start playing
        audio.play().then(() => {
          console.log('▶️ Audio started playing successfully');
        }).catch(error => {
          console.error('❌ Audio play failed:', error);
          setIsPlaying(false);
          toast({
            title: "Audio Play Failed",
            description: "Sara's voice couldn't start playing. Try again.",
            variant: "destructive",
          });
        });
      };
      
      audio.onplay = () => {
        console.log('🎵 Audio PLAY event fired');
        setIsPlaying(true);
        setIsPaused(false);
        startWordHighlighting(textWords, audio);
      };

      audio.onpause = () => {
        console.log('⏸️ Audio PAUSE event fired');
        setIsPaused(true);
        clearHighlightTimeouts();
      };

      audio.onended = () => {
        console.log('🏁 Audio ENDED event fired');
        console.log('🏁 Final audio duration was:', audio.duration, 'seconds');
        console.log('🏁 Last highlighted word index:', currentWordIndex, 'of', textWords.length);
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentWordIndex(-1);
        setWords([]);
        clearHighlightTimeouts();
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (error) => {
        console.error('💥 Audio ERROR event:', error);
        setIsPlaying(false);
        setIsPaused(false);
        clearHighlightTimeouts();
        toast({
          title: "Audio Error",
          description: "Sara's voice had trouble playing. Please try again.",
          variant: "destructive",
        });
      };

    } catch (error) {
      console.error('💥 Play audio error:', error);
      setIsPlaying(false);
      setIsPaused(false);
      toast({
        title: "Sara Voice Unavailable",
        description: error instanceof Error ? error.message : "Sara's voice is temporarily unavailable. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startWordHighlighting = (textWords: string[], audio: HTMLAudioElement) => {
    console.log('🎯 Starting word highlighting for', textWords.length, 'words');
    
    clearHighlightTimeouts();
    setCurrentWordIndex(-1);
    
    const duration = audio.duration;
    if (!duration || duration === 0) {
      console.warn('⚠️ No audio duration, using estimated timing');
      highlightWithEstimatedTiming(textWords);
      return;
    }
    
    console.log(`⏱️ Audio duration: ${duration}s, calculating timing...`);
    
    // Calculate timing based on actual audio duration with better sync
    const totalWords = textWords.length;
    // Use 90% of duration and add delay to sync with Sara's actual speech
    const timePerWord = (duration * 0.90) / totalWords * 1000; // milliseconds per word
    
    console.log(`⏱️ Time per word: ${timePerWord}ms`);
    
    // Start highlighting with delay to sync with Sara's speech
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        setCurrentWordIndex(0);
      }
    }, 800); // Longer delay to sync with Sara's speech start
    
    textWords.forEach((word, index) => {
      if (index === 0) return; // Skip first word as it's handled above
      
      const delay = index * timePerWord + 800; // Add initial delay offset to match speech
      
      const timeout = setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          setCurrentWordIndex(index);
        }
      }, delay);
      
      highlightTimeoutRef.current.push(timeout);
    });
  };
  
  const resumeWordHighlighting = (textWords: string[], audio: HTMLAudioElement) => {
    console.log('🎯 Resuming word highlighting from current position');
    
    clearHighlightTimeouts();
    
    const duration = audio.duration;
    const currentTime = audio.currentTime;
    
    if (!duration || duration === 0) {
      console.warn('⚠️ No audio duration for resume, using estimated timing');
      resumeWithEstimatedTiming(textWords, currentTime);
      return;
    }
    
    console.log(`⏱️ Resuming at ${currentTime}s of ${duration}s`);
    
    // Calculate which word we should be at based on current time
    const totalWords = textWords.length;
    const timePerWord = (duration * 0.90) / totalWords; // Match the original timing
    // Account for the initial 800ms delay when calculating current word
    const adjustedTime = Math.max(0, currentTime - 0.8); // Subtract initial delay
    const currentWordIndex = Math.floor(adjustedTime / timePerWord);
    
    console.log(`🎯 Should be at word ${currentWordIndex} when resuming`);
    
    // Set current word immediately
    if (currentWordIndex < totalWords) {
      setCurrentWordIndex(currentWordIndex);
    }
    
    // Schedule remaining words
    for (let index = currentWordIndex + 1; index < totalWords; index++) {
      const wordTime = (index * timePerWord) + 0.8; // Add initial delay offset
      const delay = (wordTime - currentTime) * 1000; // Convert to milliseconds
      
      if (delay > 0) {
        const timeout = setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
            setCurrentWordIndex(index);
          }
        }, delay);
        
        highlightTimeoutRef.current.push(timeout);
      }
    }
  };
  
  const resumeWithEstimatedTiming = (textWords: string[], currentTime: number) => {
    console.log('🎯 Using estimated timing for resume highlighting');
    
    // Sara speaks at about 135 words per minute
    const wordsPerMinute = 135;
    const secondsPerWord = 60 / wordsPerMinute;
    // Account for the initial 800ms delay
    const adjustedTime = Math.max(0, currentTime - 0.8);
    const currentWordIndex = Math.floor(adjustedTime / secondsPerWord);
    
    console.log(`🎯 Estimated current word: ${currentWordIndex}`);
    
    // Set current word immediately
    if (currentWordIndex < textWords.length) {
      setCurrentWordIndex(currentWordIndex);
    }
    
    // Schedule remaining words
    for (let index = currentWordIndex + 1; index < textWords.length; index++) {
      const wordTime = (index * secondsPerWord) + 0.8; // Add initial delay
      const delay = (wordTime - currentTime) * 1000;
      
      if (delay > 0) {
        const timeout = setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
            console.log(`🔤 Highlighting word ${index} (estimated): "${textWords[index]}"`);
            setCurrentWordIndex(index);
          }
        }, delay);
        
        highlightTimeoutRef.current.push(timeout);
      }
    }
  };
  
  const highlightWithEstimatedTiming = (textWords: string[]) => {
    console.log('🎯 Using estimated timing for highlighting');
    
    // Sara speaks at about 130-140 words per minute (more conservative for sync)
    const wordsPerMinute = 135;
    const msPerWord = (60 * 1000) / wordsPerMinute;
    
    // Start with first word after delay to sync with speech
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
        setCurrentWordIndex(0);
      }
    }, 800);
    
    textWords.forEach((word, index) => {
      if (index === 0) return; // Skip first word
      
      const delay = (index * msPerWord) + 800; // Add initial delay to match speech
      
      const timeout = setTimeout(() => {
        if (audioRef.current && !audioRef.current.paused && !audioRef.current.ended) {
          setCurrentWordIndex(index);
        }
      }, delay);
      
      highlightTimeoutRef.current.push(timeout);
    });
  };

  const pauseAudio = () => {
    console.log('⏸️ PAUSE AUDIO CALLED');
    if (audioRef.current && isPlaying && !isPaused) {
      console.log('⏸️ Pausing audio...');
      audioRef.current.pause();
      // Clear highlighting timeouts when pausing
      clearHighlightTimeouts();
      // State will be updated by the onpause event
    } else {
      console.log('⏸️ Cannot pause - audio not playing or already paused');
    }
  };

  const resumeAudio = () => {
    console.log('▶️ RESUME AUDIO CALLED');
    if (audioRef.current && isPlaying && isPaused) {
      console.log('▶️ Resuming audio...');
      audioRef.current.play().then(() => {
        console.log('▶️ Resume successful');
        // Restart highlighting from current position when resuming
        if (words.length > 0) {
          resumeWordHighlighting(words, audioRef.current!);
        }
        // State will be updated by the onplay event
      }).catch(error => {
        console.error('❌ Resume failed:', error);
        toast({
          title: "Resume Failed",
          description: "Couldn't resume Sara's voice. Try restarting.",
          variant: "destructive",
        });
      });
    } else {
      console.log('▶️ Cannot resume - audio not paused');
    }
  };

  const stopAudio = () => {
    console.log('⏹️ STOP AUDIO CALLED');
    if (audioRef.current) {
      console.log('⏹️ Stopping audio...');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
    setWords([]);
    clearHighlightTimeouts();
  };

  const restartAudio = () => {
    console.log('🔄 RESTART AUDIO CALLED');
    if (response) {
      stopAudio();
      setTimeout(() => playAudio(response.answer), 100);
    }
  };

  const renderAnswerWithHighlighting = (text: string) => {
    if (!isPlaying || words.length === 0) {
      return <span>{text}</span>;
    }

    return (
      <span>
        {words.map((word, index) => (
          <span
            key={index}
            className={`${
              index === currentWordIndex 
                ? 'underline decoration-2 underline-offset-2 decoration-blue-600' 
                : ''
            } transition-all duration-200`}
          >
            {word}{index < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    );
  };

  // Helper function to normalize scripture references for better matching
  const normalizeReference = (ref: string): string => {
    return ref
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/first/g, '1')
      .replace(/second/g, '2')
      .replace(/third/g, '3')
      .replace(/psalms/g, 'psalm')
      .trim();
  };

  // Helper function to find verse by reference with fuzzy matching
  const findVerseByReference = (normalizedRef: string) => {
    // First try exact match
    let match = BIBLE_VERSES.find(verse => 
      normalizeReference(verse.reference) === normalizedRef
    );
    
    if (match) return match;
    
    // Try partial matching - check if verse contains the reference or vice versa
    match = BIBLE_VERSES.find(verse => {
      const normalizedVerse = normalizeReference(verse.reference);
      return normalizedVerse.includes(normalizedRef) || normalizedRef.includes(normalizedVerse);
    });
    
    if (match) return match;
    
    // Try matching just the book and chapter
    const bookChapterMatch = normalizedRef.match(/^(.+?)\s+(\d+)/);
    if (bookChapterMatch) {
      const [, book, chapter] = bookChapterMatch;
      match = BIBLE_VERSES.find(verse => {
        const normalizedVerse = normalizeReference(verse.reference);
        return normalizedVerse.startsWith(`${book.trim()} ${chapter}`);
      });
    }
    
    return match;
  };

  const renderAnswerWithVerseLinks = (text: string) => {
    // Enhanced pattern to catch ALL Bible verse formats including book names
    const versePattern = /\b((?:\d\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s+Samuel|2\s+Samuel|1\s+Kings|2\s+Kings|1\s+Chronicles|2\s+Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s+of\s+Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s+Corinthians|2\s+Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s+Thessalonians|2\s+Thessalonians|1\s+Timothy|2\s+Timothy|Titus|Philemon|Hebrews|James|1\s+Peter|2\s+Peter|1\s+John|2\s+John|3\s+John|Jude|Revelation)\.?\s+\d+(?::\d+)?(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\b/gi;
    const parts = text.split(versePattern);
    
    return parts.map((part, index) => {
      // Check if this part matches our verse pattern
      const isVerseReference = versePattern.test(part);
      
      if (isVerseReference && part.trim()) {
        // Clean up the reference for matching
        const cleanPart = part.trim().replace(/[.,;]$/, '').replace(/\s+/g, ' ');
        
        // Try to find matching verse in our database
        const matchingVerse = BIBLE_VERSES.find(verse => {
          const verseRef = verse.reference.toLowerCase().replace(/\s+/g, ' ');
          const partRef = cleanPart.toLowerCase().replace(/\s+/g, ' ');
          return verseRef === partRef || 
                 verseRef.includes(partRef) || 
                 partRef.includes(verseRef);
        });
        
        // If we found a matching verse, make it clickable
        if (matchingVerse) {
          return (
            <button
              key={index}
              onClick={() => setSelectedVerse(matchingVerse)}
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              title={`Click to read ${matchingVerse.reference}`}
            >
              {part}
            </button>
          );
        } else {
          // If no exact match found, create a generic verse entry
          const genericVerse = {
            reference: cleanPart,
            text: `"${cleanPart}" - Please look up this verse in your Bible to read the full text. This is a wonderful passage that relates to your question!`
          };
          
          return (
            <button
              key={index}
              onClick={() => setSelectedVerse(genericVerse)}
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              title={`Click to see ${cleanPart}`}
            >
              {part}
            </button>
          );
        }
      } else {
        // Regular text, not a verse reference
        return <span key={index}>{part}</span>;
      }
    });
  };

  const renderScriptureReferences = (references: string) => {
    // Enhanced pattern to catch ALL Bible verse formats
    const versePattern = /\b((?:\d\s+)?(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s+Samuel|2\s+Samuel|1\s+Kings|2\s+Kings|1\s+Chronicles|2\s+Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song\s+of\s+Songs|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1\s+Corinthians|2\s+Corinthians|Galatians|Ephesians|Philippians|Colossians|1\s+Thessalonians|2\s+Thessalonians|1\s+Timothy|2\s+Timothy|Titus|Philemon|Hebrews|James|1\s+Peter|2\s+Peter|1\s+John|2\s+John|3\s+John|Jude|Revelation)\.?\s+\d+(?::\d+)?(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)\b/gi;
    const parts = references.split(versePattern);
    
    return parts.map((part, index) => {
      const isVerseReference = versePattern.test(part);
      
      if (isVerseReference && part.trim()) {
        const cleanPart = part.trim().replace(/[.,;]$/, '').replace(/\s+/g, ' ');
        
        // Try to find matching verse
        const matchingVerse = BIBLE_VERSES.find(verse => {
          const verseRef = verse.reference.toLowerCase().replace(/\s+/g, ' ');
          const partRef = cleanPart.toLowerCase().replace(/\s+/g, ' ');
          return verseRef === partRef || 
                 verseRef.includes(partRef) || 
                 partRef.includes(verseRef);
        });
        
        if (matchingVerse) {
          return (
            <button
              key={index}
              onClick={() => setSelectedVerse(matchingVerse)}
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              title={`Click to read ${matchingVerse.reference}`}
            >
              {part}
            </button>
          );
        } else {
          // Create generic verse for unknown references
          const genericVerse = {
            reference: cleanPart,
            text: `"${cleanPart}" - Please look up this verse in your Bible to read the full text. This is a wonderful passage that relates to your question!`
          };
          
          return (
            <button
              key={index}
              onClick={() => setSelectedVerse(genericVerse)}
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
              title={`Click to see ${cleanPart}`}
            >
              {part}
            </button>
          );
        }
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  const renderRecommendedResources = (resources: string) => {
    // Parse the markdown-style links and make them clickable
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = resources.split(linkPattern);
    
    const result = [];
    for (let i = 0; i < parts.length; i += 3) {
      if (parts[i]) {
        result.push(<span key={i}>{parts[i]}</span>);
      }
      if (parts[i + 1] && parts[i + 2]) {
        result.push(
          <a
            key={i + 1}
            href={parts[i + 2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {parts[i + 1]}
          </a>
        );
      }
    }
    
    return result;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg floating-animation">
              <img 
                src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" 
                alt="Maggie" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Ask Maggie Questions
            </h1>
          </div>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Hi! I'm Maggie, and I love helping with biblical questions! Ask me anything about faith, 
            and I'll share wisdom from conservative evangelical pastors and experts who focus on God's amazing grace and love.
          </p>
        </div>

        {/* Question Input */}
        <Card className="glass-card mb-6 light-runner-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What biblical question can I help you with today? (You can type or use the microphone)"
                  className="min-h-[100px] text-base resize-none pr-12 shadow-md focus:shadow-lg transition-shadow duration-200"
                  disabled={isLoading}
                />
                {browserSupportsSpeechRecognition && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 hover:bg-blue-100"
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <MicOff className="h-5 w-5 text-red-500" />
                    ) : (
                      <Mic className="h-5 w-5 text-blue-500" />
                    )}
                  </Button>
                )}
              </div>
              
              {transcript && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Listening:</strong> {transcript}
                  </p>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full magic-button bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 text-lg"
                disabled={isLoading || (!question.trim() && !transcript.trim())}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Thinking...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Ask Maggie
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Response */}
        {response && (
          <Card className="glass-card mb-6">
            <CardContent className="p-6">
              {/* SARA'S VOICE CONTROLS - MOVED TO TOP */}
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl border-2 border-blue-200 shadow-lg">
                {/* Sara Voice Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-300 shadow-md">
                      <img 
                        src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" 
                        alt="Sara" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-800 text-lg">Sara's Voice</h4>
                      <p className="text-sm text-blue-600">Azure Child Voice</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      isPlaying && !isPaused ? 'bg-green-500 animate-pulse' : 
                      isPaused ? 'bg-yellow-500' : 
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {isPlaying && !isPaused ? 'Sara Speaking...' : 
                       isPaused ? 'Sara Paused' : 
                       'Sara Ready'}
                    </span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {!isPlaying ? (
                    <Button
                      onClick={() => playAudio(response.answer)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                    >
                      <Play className="h-5 w-5" />
                      Play Sara's Voice
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {!isPaused ? (
                        <Button
                          onClick={pauseAudio}
                          className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <Pause className="h-5 w-5" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          onClick={resumeAudio}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                        >
                          <Play className="h-5 w-5" />
                          Continue
                        </Button>
                      )}
                      
                      <Button
                        onClick={restartAudio}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <RotateCcw className="h-5 w-5" />
                        Restart
                      </Button>
                      
                      <Button
                        onClick={stopAudio}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <Square className="h-5 w-5" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>

                {/* Debug Info */}
                <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">
                    <strong>Debug:</strong> Playing: {isPlaying ? 'Yes' : 'No'} | 
                    Paused: {isPaused ? 'Yes' : 'No'} | 
                    Words: {words.length} | 
                    Current Word: {currentWordIndex + 1}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-200 flex-shrink-0">
                  <img 
                    src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop" 
                    alt="Maggie" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Maggie's Response:</h3>
                  <div className="prose prose-blue max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {renderAnswerWithHighlighting(response.answer)}
                    </p>
                    
                    {response.scriptureReferences && (
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 mb-4">
                        <h4 className="font-semibold text-blue-800 mb-2">📖 Scripture References:</h4>
                        <p className="text-blue-700">
                          {renderScriptureReferences(response.scriptureReferences)}
                        </p>
                      </div>
                    )}
                    
                    {response.recommendedResources && (
                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                        <h4 className="font-semibold text-green-800 mb-2">🌟 Recommended Resources:</h4>
                        <p className="text-green-700">
                          {renderRecommendedResources(response.recommendedResources)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bible Verse Dialog */}
        <Dialog open={!!selectedVerse} onOpenChange={() => setSelectedVerse(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-800">
                📖 {selectedVerse?.reference}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-4">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-lg leading-relaxed text-gray-800 italic font-medium">
                  "{selectedVerse?.text}"
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Click anywhere outside this box to close
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Bible Verse Popup with better styling */}
        {selectedVerse && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative">
              {loadingVerse && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                  <div className="text-blue-600 text-lg">Loading verse...</div>
                </div>
              )}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
                    📖 {selectedVerse.reference}
                  </h3>
                  <button
                    onClick={() => setSelectedVerse(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-l-4 border-blue-400">
                  <p className="text-xl leading-relaxed text-gray-800 italic font-medium">
                    "{selectedVerse.text}"
                  </p>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Click the × or outside this box to close
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}