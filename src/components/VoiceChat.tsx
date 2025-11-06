import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Languages, X, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoiceChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "hi", name: "Hindi" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ar", name: "Arabic" },
];

const VoiceChat = ({ isOpen, onClose }: VoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState("en");
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        // Send to Saathi for processing with language context
        setTranscript("Processing your speech...");
        
        // This would integrate with the AI to process voice in selected language
        toast({
          title: "Voice Processed",
          description: `Processing in ${LANGUAGES.find(l => l.code === language)?.name}`,
        });
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Error",
        description: "Failed to process audio",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-24 right-24 w-96 shadow-2xl z-40 animate-scale-in">
      <CardHeader className="border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Chat
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Select Language
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recording Status */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div
            className={`rounded-full p-6 transition-all ${
              isRecording
                ? "bg-destructive animate-pulse"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-12 w-12 text-white" />
            ) : (
              <Mic className="h-12 w-12 text-white" />
            )}
          </div>

          <Button
            onClick={isRecording ? stopRecording : startRecording}
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="w-full"
          >
            {isRecording ? "Stop Recording" : "Start Voice Chat"}
          </Button>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Transcript:</p>
            <p className="mt-1">{transcript}</p>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          Speak naturally in your selected language. Saathi will understand and respond accordingly.
        </p>
      </CardContent>
    </Card>
  );
};

export default VoiceChat;
