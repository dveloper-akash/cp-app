'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Paperclip, Send, Mic, Circle, FileText, X, Check } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  createChatRoom, 
  getChatRoom, 
  sendMessage, 
  getMessages, 
  getMediaFiles,
  type Message as DBMessage,
  type MediaFile as DBMediaFile
} from '@/lib/chat';
import { uploadMediaFile } from '@/lib/media';
import MediaPreview from '@/components/MediaPreview';
import FileUpload from '@/components/FileUpload';
import { FaFileVideo, FaFileAudio, FaFilePdf, FaFile } from 'react-icons/fa';

// Add these type declarations at the top of the file, after the imports
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mediaFile?: {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
    created_at: string;
  } | null;
}

interface MediaFile {
  id: string;
  name: string;
  type: string; // e.g., image, video, audio, document
  url: string; // URL to access the file
  timestamp: string;
}

interface ProjectDetails {
  status: string;
  members: { id: string; name: string; role: string; }[];
  paymentStatus: string; // e.g., Paid, Unpaid, N/A
  // Add other project details as needed
}

type SidebarTab = 'media' | 'details'; // Define the type alias here

export default function ProjectChatPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('media'); // Use the defined type
  const [sharedMedia, setSharedMedia] = useState<MediaFile[]>([]); // State for shared media files
  const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
    status: 'Active',
    members: [
      { id: '1', name: 'Alice', role: 'Project Lead' },
      { id: '2', name: 'Bob', role: 'Developer' },
    ],
    paymentStatus: 'Paid',
  }); // State for project details
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Initialize chat room and get user ID
  useEffect(() => {
    async function initializeChat() {
      console.log('Initializing chat for project:', projectId);
      
      // Get user ID
      console.log('Fetching user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user fetched:', user?.id);
      
      if (user) {
        setUserId(user.id);
      } else {
        console.warn('No user found. Cannot load chat messages or media.');
        setIsLoading(false); // Stop loading if no user
        return; // Stop initialization if no user
      }

      // Get or create chat room
      console.log('Getting or creating chat room for project:', projectId);
      let chatRoom = await getChatRoom(projectId);
      console.log('Existing or new chat room:', chatRoom);
      
      if (!chatRoom) {
        console.log('No existing chat room, creating new one...');
        chatRoom = await createChatRoom(projectId);
        console.log('New chat room created:', chatRoom);
      }
      
      if (chatRoom) {
        setChatRoomId(chatRoom.id);
        
        // Log values right before calling getMessages
        console.log('Calling getMessages with chatRoom.id:', chatRoom.id, 'and userId:', user.id);

        // Load messages with their media files
        const dbMessages = await getMessages(chatRoom.id);
        console.log('Messages received from DB:', dbMessages);

        const formattedMessages = (dbMessages || []).map(msg => ({
          id: msg.id,
          role: (msg.user_id === user.id ? 'user' : 'assistant') as 'user' | 'assistant', // Explicitly cast role type
          content: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // Format timestamp
          mediaFile: msg.media_files ? { // Map media_files to mediaFile
            id: msg.media_files.id,
            file_name: msg.media_files.file_name,
            file_type: msg.media_files.file_type,
            file_url: msg.media_files.file_url,
            created_at: msg.media_files.created_at,
          } : null,
        }));
        
        setMessages(formattedMessages);

        // Load media files for the sidebar
        const dbMediaFiles = await getMediaFiles(chatRoom.id);
         console.log('Media files received from DB:', dbMediaFiles);
        const formattedMediaFiles = (dbMediaFiles || []).map(file => ({
          id: file.id,
          name: file.file_name,
          type: file.file_type,
          url: file.file_url,
          timestamp: new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setSharedMedia(formattedMediaFiles);
      } else {
         console.error('Could not get or create chat room.');
      }
       setIsLoading(false); // Initialization complete (success or failure)
    }

    initializeChat();
  }, [projectId, supabase, userId]); // Added userId to dependency array

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const chatContainer = document.querySelector('.overflow-y-scroll');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };

    // Immediate scroll
    scrollToBottom();
    
    // Additional scroll after a small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Close audio menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (audioMenuRef.current && !audioMenuRef.current.contains(event.target as Node)) {
        setIsAudioMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [audioMenuRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatRoomId || !userId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Send message to database
    const dbMessage = await sendMessage(chatRoomId, input, userId);
    if (dbMessage) {
      // Simulate AI response (replace with actual API call)
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a simulated response. In a real application, this would be connected to your backend API.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } else {
      setIsLoading(false);
    }
  };

  // Handle starting audio recording
  const handleRecordAudio = async () => {
    setIsAudioMenuOpen(false); // Close menu
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      // Clear previous chunks
      setAudioChunks([]);
      
      // Set up data handler before starting
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with a timeslice to get chunks more frequently
      recorder.start(1000); // Get chunks every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      console.log('Recording started...');

      // Start recording timer
      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      // Reset states on error
      setIsRecording(false);
      setRecordingTime(0);
      setAudioChunks([]);
    }
  };

  // Handle stopping audio recording
  const handleStopRecording = async () => {
    if (!chatRoomId || !userId) {
      console.error('No chat room ID or user ID available');
      return;
    }

    if (mediaRecorder && isRecording) {
      try {
        // Stop recording
        mediaRecorder.stop();
        setIsRecording(false);
        if (recordingInterval) {
          clearInterval(recordingInterval);
          setRecordingInterval(null);
        }
        setRecordingTime(0);
        console.log('Recording stopped.');

        // Wait for the last chunk to be processed
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => {
            resolve();
          };
        });

        // Ensure we have audio chunks
        if (audioChunks.length === 0) {
          throw new Error('No audio data recorded');
        }

        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Verify blob size
        if (audioBlob.size === 0) {
          throw new Error('Recorded audio is empty');
        }

        // Create a unique filename with timestamp
        const timestamp = new Date().getTime();
        const filename = `audio_${timestamp}.wav`;

        // Convert blob to File object
        const audioFile = new File([audioBlob], filename, {
          type: 'audio/wav',
          lastModified: timestamp
        });

        console.log('Audio file created:', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size
        });

        // Upload the file using uploadMediaFile
        const mediaFile = await uploadMediaFile(audioFile, chatRoomId);

        if (mediaFile) {
          // Create a message with the audio file
          const content = 'Shared an audio recording';
          const sentMessageDB = await sendMessage(chatRoomId, content, userId, mediaFile.id);

          if (sentMessageDB) {
            // Format the message for display
            const formattedMessage: Message = {
              id: sentMessageDB.id,
              role: 'user',
              content: sentMessageDB.content,
              timestamp: new Date(sentMessageDB.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              mediaFile: sentMessageDB.media_files ? {
                id: sentMessageDB.media_files.id,
                file_name: sentMessageDB.media_files.file_name,
                file_type: sentMessageDB.media_files.file_type,
                file_url: sentMessageDB.media_files.file_url,
                created_at: sentMessageDB.media_files.created_at,
              } : null,
            };

            // Update messages state
            setMessages(prev => [...prev, formattedMessage]);

            // Add to shared media
            const formattedSharedMediaFile: MediaFile = {
              id: mediaFile.id,
              name: filename,
              type: 'audio/wav',
              url: mediaFile.file_url,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setSharedMedia(prev => [...prev, formattedSharedMediaFile]);

            // Clear audio chunks after successful upload
            setAudioChunks([]);
          }
        }
      } catch (error) {
        console.error('Error saving audio recording:', error);
        // Reset recording state
        setIsRecording(false);
        setRecordingTime(0);
        setAudioChunks([]);
        // TODO: Show error message to user
      }
    }
  };

  // Handle canceling recording
  const handleCancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      setRecordingTime(0);
      setAudioChunks([]);
      console.log('Recording canceled.');
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add this useEffect to handle auto-dismissing messages
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (speechError) {
      // Auto-dismiss after 3 seconds
      timeoutId = setTimeout(() => {
        setSpeechError(null);
      }, 3000);
    }

    // Cleanup timeout on unmount or when error changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [speechError]);

  // Update the handleSpeechToText function to use shorter messages
  const handleSpeechToText = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    try {
      if (isListening) {
        // If we're listening, just stop
        setIsListening(false);
        setRetryCount(0); // Reset retry count when stopping
        setSpeechError(null); // Clear any error messages
      } else {
        // Create a new recognition instance
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
          console.log('Speech recognition started');
          setSpeechError('Listening...');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          console.log('Speech recognition result:', event.results);
          
          const results = Array.from(event.results);
          const lastResult = results[results.length - 1];
          const alternatives = Array.from(lastResult);
          
          const bestAlternative = alternatives.reduce((best, current) => {
            return (current.confidence > best.confidence) ? current : best;
          }, alternatives[0]);

          const transcript = bestAlternative.transcript;
          console.log('Selected transcript:', transcript, 'with confidence:', bestAlternative.confidence);
          
          setInput(transcript);
          setRetryCount(0);
          setSpeechError(null);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error === 'aborted') {
            return;
          }

          console.log('Speech recognition error:', event.error);

          switch (event.error) {
            case 'no-speech':
              setSpeechError('No speech detected');
              break;

            case 'network':
              if (retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
                setSpeechError('Network error, retrying...');
                setTimeout(() => {
                  try {
                    recognition.start();
                  } catch (e) {
                    console.error('Error restarting recognition:', e);
                    setIsListening(false);
                    setSpeechError('Failed to restart');
                  }
                }, 1000);
              } else {
                setIsListening(false);
                setRetryCount(0);
                setSpeechError('Network error');
              }
              break;
            
            case 'not-allowed':
            case 'permission-denied':
              setIsListening(false);
              setRetryCount(0);
              setSpeechError('Microphone access denied');
              break;
            
            default:
              setIsListening(false);
              setRetryCount(0);
              setSpeechError('Recognition error');
          }
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
          if (retryCount === 0) {
            setIsListening(false);
          }
        };

        recognition.start();
        setIsListening(true);
        setSpeechError('Listening...');
      }
    } catch (error) {
      console.error('Error with speech recognition:', error);
      setIsListening(false);
      setRetryCount(0);
      setSpeechError('Failed to start');
    }
    setIsAudioMenuOpen(false);
  };

  // Update the audio menu button to show retry state
  const renderAudioMenuButton = () => (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsAudioMenuOpen(!isAudioMenuOpen);
        }}
        className={`p-2 border-2 ${isListening ? 'border-red-500 bg-red-50' : 'border-gray-200'} hover:bg-gray-100 rounded-lg transition-colors`}
        aria-label="Audio options"
      >
        <Mic className={`h-6 w-6 ${isListening ? 'text-red-500' : 'text-black'}`} />
        {retryCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {retryCount}
          </span>
        )}
      </button>

      {/* Audio Menu */}
      {isAudioMenuOpen && (
        <div
          ref={audioMenuRef}
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-white rounded-lg shadow-lg py-1.5 ring-1 ring-gray-200 z-10"
        >
          <button
            onClick={handleRecordAudio}
            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Record Audio
          </button>
          <button
            onClick={handleSpeechToText}
            className={`block w-full text-left px-4 py-2.5 text-sm ${isListening ? 'text-red-500' : 'text-gray-700'} hover:bg-gray-100 transition-colors`}
          >
            {isListening ? 'Stop Listening' : 'Speech to Text'}
          </button>
        </div>
      )}
    </div>
  );

  // This function is triggered when the FileUpload component successfully uploads a file.
  // It receives the full DBMediaFile object from the database insert (via uploadMediaFile).
  const handleFileUpload = (mediaFile: DBMediaFile) => { // Use the imported DBMediaFile type, make it non-async
    console.log('FileUpload component reported upload complete with mediaFile:', mediaFile);

    // Use optional chaining for safety, although mediaFile should exist based on the if check above
    if (!chatRoomId || !userId || !mediaFile) return;
    // Do NOT set isLoading here, the FileUpload component handles its own loading state

    // We cannot await sendMessage directly in a non-async handler
    // We need to perform the message sending and state updates within this handler
    // or trigger an async process that does it.
    // For simplicity and immediate feedback, let's perform the async operations here
    // while accepting the handler itself isn't strictly async/awaitable by the prop.

    // Define an async IIFE (Immediately Invoked Function Expression) to use await
    (async () => {
      try {
        // 1. Send a chat message linked to the media file using its ID
        // Use file_name from the received DBMediaFile
        const content = `Shared a file: ${mediaFile.file_name}`; 
        // sendMessage is async, so await it
        const sentMessageDB = await sendMessage(chatRoomId, content, userId, mediaFile.id);

        if (sentMessageDB) {
           console.log('Message sent to DB with media link:', sentMessageDB);
          // 2. Format the received database message (which is DBMessage/lib/chat.ts structure)
          // to match the component's Message interface
          const formattedMessage: Message = {
              id: sentMessageDB.id,
              role: (sentMessageDB.user_id === userId ? 'user' : 'assistant') as 'user' | 'assistant', // Determine role based on user ID
              content: sentMessageDB.content,
              // Use created_at from sentMessageDB for message timestamp
              timestamp: new Date(sentMessageDB.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
              // Map media_files from sentMessageDB (if it exists) to mediaFile
              mediaFile: sentMessageDB.media_files ? { 
                id: sentMessageDB.media_files.id,
                file_name: sentMessageDB.media_files.file_name, // Keep DB field names here for mapping
                file_type: sentMessageDB.media_files.file_type,
                file_url: sentMessageDB.media_files.file_url,
                created_at: sentMessageDB.media_files.created_at,
              } : null,
            };

          // 3. Update local messages state with the correctly formatted message
          setMessages(prev => [...prev, formattedMessage]);

          // 4. Add the media file to the shared media state immediately
          // Map properties from the received DBMediaFile to the local MediaFile interface structure
          const formattedSharedMediaFile: MediaFile = {
              id: mediaFile.id,
              name: mediaFile.file_name, // Map file_name to name
              type: mediaFile.file_type, // Map file_type to type
              url: mediaFile.file_url,   // Map file_url to url
              timestamp: new Date(mediaFile.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) // Map created_at to timestamp
          };
          console.log('Adding media file to sharedMedia state:', formattedSharedMediaFile);
          setSharedMedia(prev => [...prev, formattedSharedMediaFile]);

        } else {
           console.error('Failed to send message to database after file upload.');
           // TODO: Consider showing an error to the user and potentially deleting the uploaded media file
        }
      } catch (error) {
        console.error('Error sending message after file upload:', error);
        // TODO: Show a generic error message to the user
      } finally {
        // We are inside an IIFE, so setting loading state here might not be ideal
        // if the FileUpload component already handles isLoading.
        // If needed, manage isLoading state more globally or in the FileUpload component.
      }
    })(); // End of async IIFE
  };

  const handleFileUploadError = (error: string) => {
    console.error('File upload error:', error);
    // You might want to show a toast notification here
  };

  return (
    <div className="flex flex-col h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-300 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Back to dashboard"
          >
            {/* Back Icon - changed to black */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Project Chat</h1>
        </div>
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Toggle sidebar"
        >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
           </svg>
        </button>
      </header>

      {/* Main Content Area and Input Form Container */}
      <div className="flex flex-1 relative">
        {/* Chat Container - Scrollable area for messages */}
        <div className={`flex-1 overflow-y-scroll py-6 space-y-8 px-4 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'mr-80' : ''}`}>
          <div className="max-w-4xl mx-auto" style={{ 
            height: 'calc(100vh - 140px)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#CBD5E0 #F7FAFC',
            msOverflowStyle: 'auto'
          }}>
            <style jsx global>{`
              ::-webkit-scrollbar {
                width: 8px;
              }
              ::-webkit-scrollbar-track {
                background: #F7FAFC;
              }
              ::-webkit-scrollbar-thumb {
                background-color: #CBD5E0;
                border-radius: 4px;
              }
            `}</style>
            {messages.map((message) => (
              <div key={`message-${message.id}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-8`}>
                {/* Profile Icon for Assistant */}
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-700 mr-3 flex-shrink-0">
                    {/* Replace with actual image or user initial/icon */}
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[60%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.mediaFile && (
                    <MediaPreview
                      url={message.mediaFile.file_url}
                      type={message.mediaFile.file_type}
                      fileName={message.mediaFile.file_name}
                    />
                  )}
                  <div className="text-xs opacity-70 mt-3 text-left">{message.timestamp}</div>
                </div>

                {/* Profile Icon for User */}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center text-sm font-semibold text-blue-800 ml-3 flex-shrink-0">
                     {/* Replace with actual image or user initial/icon */}
                    You
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-16" />
          </div>
        </div>

        {/* Input Form Area - Fixed at the bottom */}
        <div className={`absolute bottom-0 left-0 right-0 border-t-2 border-gray-300 bg-white p-2 shadow-lg transition-all duration-300 ease-in-out ${isSidebarOpen ? 'mr-80' : ''}`}>
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center space-x-4 px-4 py-1.5 rounded-xl border-2 border-gray-300 bg-white">
              {/* File Upload Component */}
              {chatRoomId && !isRecording && (
                <FileUpload
                  chatRoomId={chatRoomId}
                  onUploadComplete={handleFileUpload}
                  onUploadError={handleFileUploadError}
                />
              )}

              {/* Audio Icon - using lucide-react */}
              {!isRecording && renderAudioMenuButton()}

              {/* Recording Interface */}
              {isRecording ? (
                <div className="flex-1 flex items-center space-x-4">
                  <div className="flex-1 flex items-center space-x-3 bg-red-50 px-4 py-2 rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-600 font-medium">{formatRecordingTime(recordingTime)}</span>
                    <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                    aria-label="Cancel recording"
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                    aria-label="Save recording"
                  >
                    <Check className="h-6 w-6" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Type your message..."}
                    className="flex-1 text-black focus:outline-none px-4 py-2 w-full"
                  />
                  {isListening && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}
              {!isRecording && (
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </form>
            
            {/* Error Message - Moved outside the form and styled better */}
            {speechError && (
              <div className="mt-2 px-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-red-600">{speechError}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sliding Sidebar */}
        <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform ease-in-out duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Sidebar Header - Assume a fixed height, e.g., h-16 (adjust based on actual height) */}
          {/* p-4 py-3 flex items-center justify-between */} {/* This looks roughly like h-16 */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 h-16"> {/* Added flex-shrink-0 and estimated h-16 */}
            <h2 className="text-lg text-black font-semibold">Project Info</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs - Assume a fixed height, e.g., h-12 (adjust based on actual height) */}
          {/* flex border-b border-gray-200 */} {/* This looks roughly like h-12 */}
          <div className="flex border-b border-gray-200 flex-shrink-0 h-12"> {/* Added flex-shrink-0 and estimated h-12 */}
            <button
              className={`flex-1 py-3 text-center text-sm font-medium ${
                activeSidebarTab === 'media'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveSidebarTab('media')}
            >
              Media
            </button>
            <button
              className={`flex-1 py-3 text-center text-sm font-medium ${
                activeSidebarTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveSidebarTab('details')}
            >
              Details
            </button>
          </div>

          {/* Tab Content - This will be the scrollable area */}
          {/* Revert to flex-1 and overflow-y-auto, remove fixed height style */}
          {/* Add pb-4 to the overflow-y-auto container itself */}
          {/* Add min-h-0 for better flexbox behavior */} 
          <div className="flex-1 overflow-y-auto pb-4 min-h-0"> {/* Added min-h-0 */} 
            {activeSidebarTab === 'media' && (
              <div className="p-4"> {/* Removed inner pb-12 */}
                <h3 className="text-lg text-black font-semibold mb-4 flex items-center justify-between">
                  <span>Shared Media</span>
                  <span className="ml-2 text-sm text-gray-500">({sharedMedia.length})</span>
                </h3>
                {sharedMedia.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No media files shared yet.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3"> {/* Removed pb-12 */} 
                      {[...sharedMedia].reverse().map((file) => (
                        <a 
                          key={file.id} 
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-50 rounded-lg overflow-hidden hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          {file.type.startsWith('image/') ? (
                            <div className="relative aspect-[4/3]">
                              <Image
                                src={file.url}
                                alt={file.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 25vw"
                                unoptimized={file.url.includes('cloudinary.com')}
                              />
                            </div>
                          ) : (
                            <div className="p-3">
                              <div className="flex items-center gap-2">
                                {file.type.startsWith('video/') ? (
                                  <FaFileVideo className="w-5 h-5 text-purple-500" />
                                ) : file.type.startsWith('audio/') ? (
                                  <FaFileAudio className="w-5 h-5 text-green-500" />
                                ) : file.type === 'application/pdf' ? (
                                  <FaFilePdf className="w-5 h-5 text-red-500" />
                                ) : (
                                  <FaFile className="w-5 h-5 text-gray-500" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500">{file.type}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{file.timestamp}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                    {/* Add a spacer div to ensure enough scroll space at the bottom */}
                    <div className="h-16"></div> {/* Reduced spacer height to h-16 */}
                  </>
                )}
              </div>
            )}

            {activeSidebarTab === 'details' && (
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Project Details</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        projectDetails.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {projectDetails.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Team Members</h4>
                    <div className="space-y-3">
                      {projectDetails.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                              {member.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Payment Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        projectDetails.paymentStatus === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {projectDetails.paymentStatus}
                      </span>
                    </div>
                    {/* Enhanced Payment Details */}
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Amount</span>
                        <span className="text-sm font-medium text-gray-900">$2,500.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Payment Date</span>
                        <span className="text-sm text-gray-900">Mar 15, 2024</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Payment Method</span>
                        <span className="text-sm text-gray-900">Credit Card</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Transaction ID</span>
                        <span className="text-sm text-gray-900 font-mono">#TRX-2024-0315</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
