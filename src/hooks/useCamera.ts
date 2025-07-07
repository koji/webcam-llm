import { useRef, useEffect, useState } from 'react'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        streamRef.current = stream
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
    }
  }, [])

  function captureImage(): string | null {
    if (!streamRef.current || !videoRef.current?.videoWidth) {
      return null
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    if (canvas && video) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', 0.8)
      }
    }
    return null
  }

  return { videoRef, canvasRef, captureImage, cameraError }
}
