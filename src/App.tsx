import { useState, useRef } from 'react';
import './App.css';
import { useCamera } from './hooks/useCamera';
import { useIntervalProcessing } from './hooks/useIntervalProcessing';
import { sendChatCompletionRequest } from './utils/api';

const localHost = 'lm_studio_url'

function App() {
  // State for user input and app status
  const [instruction, setInstruction] = useState('What do you see? Create a short description of the image. Please respond in Japanese.');
  const [responseText, setResponseText] = useState('Camera access granted. Ready to start.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intervalMs, setIntervalMs] = useState(500);
  const [baseURL, setBaseURL] = useState(localHost);
  const [fps, setFps] = useState(0);

  // FPS tracking refs
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // Frame skip ref
  const isProcessingFrameRef = useRef(false);

  // Camera hook
  const { videoRef, canvasRef, captureImage, cameraError } = useCamera();

  // Send data to server with frame skip
  async function processFrame() {
    if (isProcessingFrameRef.current) {
      // Skip this frame if previous is still processing
      return;
    }
    isProcessingFrameRef.current = true;

    frameCountRef.current += 1;
    const now = Date.now();
    if (now - lastFpsUpdateRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = now;
    }

    try {
      const imageBase64URL = captureImage();
      if (!imageBase64URL) {
        setResponseText('Failed to capture image. Stream might not be active.');
        return;
      }
      const response = await sendChatCompletionRequest(baseURL, instruction, imageBase64URL);
      setResponseText(response);
    } catch (error) {
      setResponseText(`Error: ${error}`);
    } finally {
      isProcessingFrameRef.current = false;
    }
  }

  // Interval processing hook
  useIntervalProcessing(processFrame, intervalMs, isProcessing);

  // Start/Stop handlers
  function handleStartStopClick() {
    if (isProcessing) {
      setIsProcessing(false);
      if (responseText.startsWith('Processing started...')) {
        setResponseText('Processing stopped.');
      }
    } else {
      if (cameraError) {
        setResponseText(cameraError);
        alert(cameraError);
        return;
      }
      setIsProcessing(true);
      setResponseText('Processing started...');
      // Reset FPS counters (do not reset FPS value)
      frameCountRef.current = 0;
      lastFpsUpdateRef.current = Date.now();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1 }}>
        <h1 className='title'>Camera Interaction App</h1>

        <video ref={videoRef} id="videoFeed" autoPlay playsInline></video>
        <canvas ref={canvasRef} id="canvas" className="hidden"></canvas>

        <div style={{ margin: '8px 0', fontWeight: 'bold' }}>
          FPS: {fps} <span style={{ fontWeight: 'normal', fontSize: '0.9em' }}>(use a shorter interval for more accurate FPS)</span>
        </div>

        <div className="io-areas">
          <div>
            <label htmlFor="baseURL">Base API:</label><br />
            <input id="baseURL" name="Instruction" value={baseURL} onChange={(e) => setBaseURL(e.target.value)} />
          </div>
          <div>
            <label htmlFor="instructionText">Instruction:</label><br />
            <textarea id="instructionText" style={{ height: '2em', width: '40em' }} name="Instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} disabled={isProcessing}></textarea>
          </div>
          <div>
            <label htmlFor="responseText">Response:</label><br />
            <textarea id="responseText" style={{ height: '20em', width: '40em' }} name="Response" readOnly placeholder="Server response will appear here..." value={responseText}></textarea>
          </div>
        </div>

        <div className="controls">
          <label htmlFor="intervalSelect">Interval between 2 requests:</label>
          <select id="intervalSelect" name="Interval between 2 requests" value={intervalMs} onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))} disabled={isProcessing}>
            <option value="100">100ms</option>
            <option value="250">250ms</option>
            <option value="500">500ms</option>
            <option value="1000">1s</option>
            <option value="2000">2s</option>
          </select>
          <button id="startButton" className={isProcessing ? 'stop' : 'start'} onClick={handleStartStopClick}>
            {isProcessing ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
