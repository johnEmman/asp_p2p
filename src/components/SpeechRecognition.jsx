import React, { useState, useEffect, useRef } from "react";
import { pipeline } from "@huggingface/transformers";

const SpeechRecognition = () => {
  const [output, setOutput] = useState(""); // Holds the transcription output
  const [error, setError] = useState(""); // Holds any error messages
  const [isRecording, setIsRecording] = useState(false); // Recording status
  const [mediaRecorder, setMediaRecorder] = useState(null); // MediaRecorder instance
  const [transcriber, setTranscriber] = useState(null); // Transcriber function
  const audioChunksRef = useRef([]); // Ref to store audio chunks

  useEffect(() => {
    // Function to check WebGPU support
    const checkWebGPU = async () => {
      try {
        const adapter = await navigator.gpu?.requestAdapter();
        return adapter !== undefined;
      } catch {
        return false;
      }
    };

    // Load transcriber when component mounts
    const loadTranscriber = async () => {
      try {
        const device = (await checkWebGPU()) ? "webgpu" : "wasm";
        console.log(`Using device: ${device}`);

        // Create an automatic speech recognition pipeline with WebGPU/WASM acceleration
        const transcriberInstance = await pipeline(
          "automatic-speech-recognition",
          "onnx-community/whisper-tiny.en",
          { dtype: "fp32", device: device }
        );

        if (typeof transcriberInstance === "function") {
          setTranscriber(() => transcriberInstance); // Set transcriber if valid
          console.log("Transcriber loaded successfully.");
        } else {
          throw new Error("Transcriber instance is not a callable function.");
        }
      } catch (err) {
        console.error("Error loading transcription model:", err);
        setError("Error loading model: " + err.message);
      }
    };

    loadTranscriber();
  }, []);

  // Start recording audio
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = async (event) => {
        audioChunksRef.current.push(event.data); // Collect audio chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        // Process each audio chunk for transcription in real-time
        if (transcriber && typeof transcriber === "function") {
          await handleTranscribeAudio(audioBlob); // Transcribe the audio blob
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Error: " + err.message);
    }
  };

  // Stop recording audio
  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  };

  // Convert audioBlob to a URL for the transcriber
  const blobToUrl = (blob) => {
    return URL.createObjectURL(blob);
  };

  // Transcribe audio blob
  const handleTranscribeAudio = async (audioBlob) => {
    try {
      if (!audioBlob) {
        setError("Invalid audio data.");
        return;
      }

      const audioUrl = blobToUrl(audioBlob); // Convert blob to URL
      console.log("Audio URL:", audioUrl);

      if (typeof transcriber === "function") {
        const transcription = await transcriber(audioUrl);
        console.log("Transcription result:", transcription);

        if (transcription && transcription.text) {
          setOutput((prev) => prev + " " + transcription.text);
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
    } finally {
      URL.revokeObjectURL(audioUrl); // Revoke the URL to free memory
    }
  };

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
