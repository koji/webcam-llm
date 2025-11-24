import { useRef, useEffect, useState } from 'react'

import Hls from 'hls.js'

export function useCamera({ source, url }: { source: 'local' | 'online'; url?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let hls: Hls | null = null;

    async function initCamera() {
      setCameraError(null)
      try {
        if (source === 'local') {
          // Clean up any previous src
          if (videoRef.current) {
             videoRef.current.src = ''
             videoRef.current.srcObject = null
          }
          
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          streamRef.current = stream
        } else if (source === 'online' && url) {
           // Stop local stream if it exists
           if (streamRef.current) {
             streamRef.current.getTracks().forEach((track) => track.stop())
             streamRef.current = null
           }
           if (videoRef.current) {
             videoRef.current.srcObject = null
             videoRef.current.crossOrigin = 'anonymous'

             if (url.endsWith('.m3u8')) {
                if (Hls.isSupported()) {
                    hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(videoRef.current);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        videoRef.current?.play().catch(e => console.error("Error playing HLS:", e));
                    });
                    hls.on(Hls.Events.ERROR, (_event, data) => {
                        if (data.fatal) {
                            setCameraError(`HLS Error: ${data.type} - ${data.details}`);
                        }
                    });
                } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                    // Native HLS support (Safari)
                    videoRef.current.src = url;
                    try {
                        await videoRef.current.play();
                    } catch (e) {
                         throw new Error(`Failed to play video: ${(e as Error).message}`)
                    }
                } else {
                    setCameraError('HLS is not supported in this browser.');
                }
             } else {
                 // Standard video
                 videoRef.current.src = url
                 try {
                   await videoRef.current.play()
                 } catch (e) {
                   throw new Error(`Failed to play video: ${(e as Error).message}`)
                 }
             }
           }
        }
      } catch (err) {
        let message = 'Unknown error'
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          'message' in err
        ) {
          message = `${(err as { name: string; message: string }).name} - ${
            (err as { name: string; message: string }).message
          }`
        } else if (err instanceof Error) {
            message = err.message
        }
        setCameraError(
          `Error accessing camera: ${message}. Please ensure permissions are granted and you are on HTTPS or localhost.`
        )
      }
    }
    initCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (hls) {
          hls.destroy();
      }
    }
  }, [source, url])

  function captureImage(): string | null {
    // For online video, we don't need streamRef.current to be set
    if (!videoRef.current?.videoWidth) {
      return null
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    if (canvas && video) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (context) {
        try {
            context.drawImage(video, 0, 0, canvas.width, canvas.height)
            return canvas.toDataURL('image/jpeg', 0.8)
        } catch (e) {
            console.error("Canvas taint error or other issue:", e)
            return null
        }
      }
    }
    return null
  }

  return { videoRef, canvasRef, captureImage, cameraError }
}
