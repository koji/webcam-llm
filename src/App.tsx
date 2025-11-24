import { useState, useRef } from 'react';
import './App.css';
import { useCamera } from './hooks/useCamera';
import { useIntervalProcessing } from './hooks/useIntervalProcessing';
import { sendChatCompletionRequest } from './utils/api';

const localHost = 'http://127.0.0.1:1234'

function App() {
  // State for user input and app status
  const [instruction, setInstruction] = useState('What do you see? Create a short description of the image.');
  const [responseText, setResponseText] = useState('Camera access granted. Ready to start.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [intervalMs, setIntervalMs] = useState(500);
  const [baseURL, setBaseURL] = useState(localHost);
  const [fps, setFps] = useState(0);
  const [cameraSource, setCameraSource] = useState<'local' | 'online'>('local');
  const [onlineUrl, setOnlineUrl] = useState('');

  // FPS tracking refs
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());

  // Frame skip ref
  const isProcessingFrameRef = useRef(false);

  // Camera hook
  const { videoRef, canvasRef, captureImage, cameraError } = useCamera({ source: cameraSource, url: onlineUrl });

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
        setResponseText('Failed to capture image. Stream might not be active or CORS issue with online video.');
        return;
      }
      const response = await sendChatCompletionRequest(baseURL, instruction, imageBase64URL);
      setResponseText(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResponseText(`Error: ${errorMessage}`);
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
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 className='title' style={{ textAlign: 'center', marginBottom: '20px' }}>Camera Interaction App</h1>
      
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left Panel: Camera Related */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ marginBottom: '10px' }}>
                <label>
                    <input 
                        type="radio" 
                        value="local" 
                        checked={cameraSource === 'local'} 
                        onChange={() => setCameraSource('local')} 
                    />
                    Local Webcam
                </label>
                <label style={{ marginLeft: '10px' }}>
                    <input 
                        type="radio" 
                        value="online" 
                        checked={cameraSource === 'online'} 
                        onChange={() => setCameraSource('online')} 
                    />
                    Online Camera URL
                </label>
            </div>

            {cameraSource === 'online' && (
                <div style={{ marginBottom: '10px' }}>
                    <input 
                        type="text" 
                        placeholder="Enter video URL (e.g., https://example.com/video.mp4)" 
                        value={onlineUrl} 
                        onChange={(e) => setOnlineUrl(e.target.value)}
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                    />
                </div>
            )}

            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000' }}>
                <video 
                    ref={videoRef} 
                    id="videoFeed" 
                    autoPlay 
                    playsInline 
                    controls={cameraSource === 'online'}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                ></video>
            </div>
            <canvas ref={canvasRef} id="canvas" className="hidden"></canvas>

            <div style={{ margin: '8px 0', fontWeight: 'bold' }}>
            FPS: {fps} <span style={{ fontWeight: 'normal', fontSize: '0.9em' }}>(use a shorter interval for more accurate FPS)</span>
            </div>
        </div>

        {/* Right Panel: Inference Related */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="io-areas">
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="baseURL" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Base API:</label>
                <input 
                    id="baseURL" 
                    name="Instruction" 
                    value={baseURL} 
                    onChange={(e) => setBaseURL(e.target.value)} 
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="instructionText" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Instruction:</label>
                <textarea 
                    id="instructionText" 
                    style={{ height: '4em', width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }} 
                    name="Instruction" 
                    value={instruction} 
                    onChange={(e) => setInstruction(e.target.value)} 
                    disabled={isProcessing}
                ></textarea>
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="responseText" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Response:</label>
                <textarea 
                    id="responseText" 
                    style={{ height: '20em', width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical' }} 
                    name="Response" 
                    readOnly 
                    placeholder="Server response will appear here..." 
                    value={responseText}
                ></textarea>
            </div>
            </div>

            <div className="controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <label htmlFor="intervalSelect">Interval:</label>
            <select 
                id="intervalSelect" 
                name="Interval between 2 requests" 
                value={intervalMs} 
                onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))} 
                disabled={isProcessing}
                style={{ padding: '5px' }}
            >
                <option value="100">100ms</option>
                <option value="250">250ms</option>
                <option value="500">500ms</option>
                <option value="1000">1s</option>
                <option value="2000">2s</option>
            </select>
            <button 
                id="startButton" 
                className={isProcessing ? 'stop' : 'start'} 
                onClick={handleStartStopClick}
                style={{ 
                    padding: '8px 20px', 
                    backgroundColor: isProcessing ? '#ff4444' : '#4CAF50', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                {isProcessing ? 'Stop' : 'Start'}
            </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default App;
