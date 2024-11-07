import React, { useState, useEffect, useRef, useCallback } from "react";
import { pipeline } from "@huggingface/transformers";

const SpeechRecognition = () => {
  const [output, setOutput] = useState(""); // Holds the transcription output
  const [error, setError] = useState(""); // Holds any error messages
  const [isRecording, setIsRecording] = useState(false); // Recording status
  const [transcriber, setTranscriber] = useState(null); // Transcriber function
  const audioChunksRef = useRef([]); // Ref to store audio chunks
  const mediaRecorderRef = useRef(null); // Ref to MediaRecorder

  // Load transcriber (Whisper model)

  useEffect(() => {
    const loadTranscriber = async () => {
      try {
        
        const transcriberInstance = await pipeline(
          "automatic-speech-recognition",
          "onnx-community/whisper-tiny.en",
          { dtype: "fp32",   } // Optionally configure the model for WebGPU/WASM if needed
        );

        setTranscriber(() => transcriberInstance);
        console.log("Transcriber loaded successfully.");
      } catch (err) {
        console.error("Error loading transcription model:", err);
        setError("Error loading model: " + err.message);
      }
    };

    loadTranscriber();
  }, []);

  // Start recording audio
  const handleStartRecording = useCallback(async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = async (event) => {
        audioChunksRef.current.push(event.data); // Collect audio chunks
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        // Process the audio chunks for transcription after stopping
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await handleTranscribeAudio(audioBlob);
        audioChunksRef.current = []; // Clear audio chunks after processing
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // Collect audio in small chunks (100ms) for real-time processing
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Error accessing microphone: " + err.message);
    }
  }, [transcriber]);

  // Stop recording audio
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Convert audioBlob to a URL for the transcriber
  const blobToUrl = (blob) => {
    return URL.createObjectURL(blob);
  };

  // Transcribe audio blob
  const handleTranscribeAudio = useCallback(
    async (audioBlob) => {
      try {
        if (!audioBlob) {
          setError("Invalid audio data.");
          return;
        }

        const audioUrl = blobToUrl(audioBlob); // Convert blob to URL
        console.log("Audio URL:", audioUrl);

        if (transcriber) {
          const transcription = await transcriber(audioUrl); // Transcribe audio blob
          console.log("Transcription result:", transcription);

          if (transcription && transcription.text) {
            setOutput((prev) => prev + " " + transcription.text); // Append the transcribed text
            setError(""); // Clear any previous errors
          } else {
            setError("No transcription text returned.");
          }
        } else {
          setError("Transcriber is not properly initialized.");
        }
      } catch (error) {
        console.error("Transcription error:", error);
        setError("An error occurred during transcription.");
      }
    },
    [transcriber]
  );

  return (
    <div>
      <h3>Real-Time Speech Recognition</h3>
      <div>
        {!isRecording ? (
          <button onClick={handleStartRecording}>Start Recording</button>
        ) : (
          <button onClick={handleStopRecording}>Stop Recording</button>
        )}
      </div>
      {output && (
        <div>
          <h3>Transcription Output:</h3>
          <p>{output}</p>
        </div>
      )}
      {error && (
        <div>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default SpeechRecognition;
