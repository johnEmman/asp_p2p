import React, { useState, useRef } from "react";
import { pipeline } from "@huggingface/transformers";
const testPipeline = async () => {
  try {
    console.log("Attempting to load the pipeline...");
    const pipe = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small" // or try "whisper-medium"
    );
    console.log("Pipeline loaded successfully.");
    return pipe;
  } catch (error) {
    console.error("Error loading pipeline:", error);
  }
};

testPipeline();
function SpeechToTextTranscriber() {
  const [transcription, setTranscription] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Start recording audio from the microphone
  const startRecording = async () => {
    console.log("Attempting to start recording...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted.");

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = []; // Reset audio chunks
      console.log("MediaRecorder initialized.");

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("Audio data chunk added.");
        }
      };

      mediaRecorderRef.current.onstart = () => {
        console.log("Recording started.");
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("Recording stopped.");
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        console.log("Audio blob created, starting transcription...");
        transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error("Error accessing the microphone:", error);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      console.log("Stopped recording.");
    }
  };

  // Transcribe the audio blob using Hugging Face's pipeline
  // Transcribe the audio blob using Hugging Face's pipeline
  const transcribeAudio = async (audioBlob) => {
    setLoading(true);
    try {
      console.log("Loading the speech recognition pipeline...");
      const pipe = await pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-large-v3"
      );
      console.log("Pipeline loaded, starting transcription...");

      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Decode audio data to Float32Array using AudioContext
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const float32AudioData = audioBuffer.getChannelData(0); // Extract single channel (mono)

      // Check audio data properties
      console.log("Audio data length:", float32AudioData.length);
      console.log("Audio sample rate:", audioBuffer.sampleRate);

      // Transcribe the audio data
      const result = await pipe(float32AudioData);
      console.log("Transcription complete:", result.text);
      setTranscription(result.text);
    } catch (error) {
      console.error("Error during transcription:", error);
      setTranscription("Failed to transcribe audio");
    }
    setLoading(false);
  };

  return (
    <div>
      <h1>Mic-to-Text Transcriber</h1>
      <button onClick={recording ? stopRecording : startRecording}>
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      {loading && <p>Transcribing...</p>}
      {transcription && (
        <div>
          <h2>Transcription:</h2>
          <p>{transcription}</p>
        </div>
      )}
    </div>
  );
}

export default SpeechToTextTranscriber;
