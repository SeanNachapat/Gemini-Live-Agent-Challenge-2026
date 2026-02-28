'use client'

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = "ws://localhost:8080";
const VIDEO_CAPTURE_INTERVAL = 1000;
const AUDIO_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;

const Camera = () => {
      const [isActive, setIsActive] = useState(false);
      const [error, setError] = useState(null);

      const [videoDevices, setVideoDevices] = useState([]);
      const [audioDevices, setAudioDevices] = useState([]);

      const [selectedVideoId, setSelectedVideoId] = useState('');
      const [selectedAudioId, setSelectedAudioId] = useState('');

      const [facingMode, setFacingMode] = useState('user');

      const videoRef = useRef(null);
      const streamRef = useRef(null);

      const [isStreaming, setIsStreaming] = useState(true);


      const [sessionActive, setSessionActive] = useState(false);
      const [geminiStatus, setGeminiStatus] = useState('disconnected');
      const wsRef = useRef(null);
      const audioContextRef = useRef(null);
      const playbackContextRef = useRef(null);
      const processorRef = useRef(null);
      const sourceRef = useRef(null);
      const videoCaptureRef = useRef(null);
      const audioQueueRef = useRef([]);
      const isPlayingRef = useRef(false);

      const enumerateDevices = useCallback(async () => {
            try {
                  const devices = await navigator.mediaDevices.enumerateDevices();
                  const videos = devices.filter(d => d.kind === 'videoinput');
                  const audios = devices.filter(d => d.kind === 'audioinput');
                  setVideoDevices(videos);
                  setAudioDevices(audios);

                  if (!selectedVideoId && videos.length > 0) {
                        setSelectedVideoId(videos[0].deviceId);
                  }
                  if (!selectedAudioId && audios.length > 0) {
                        setSelectedAudioId(audios[0].deviceId);
                  }
            } catch (err) {
                  console.error('Failed to enumerate devices:', err);
            }
      }, [selectedVideoId, selectedAudioId]);

      const startCamera = useCallback(async (videoId, audioId) => {
            if (streamRef.current) {
                  streamRef.current.getTracks().forEach(t => t.stop());
            }

            const videoConstraints = videoId
                  ? { deviceId: { exact: videoId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                  : { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } };

            const constraints = {
                  video: videoConstraints,
                  audio: audioId
                        ? { deviceId: { exact: audioId } }
                        : true,
            };

            try {
                  const stream = await navigator.mediaDevices.getUserMedia(constraints);
                  streamRef.current = stream;

                  if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        await videoRef.current.play();
                  }

                  setIsActive(true);
                  setError(null);

                  await enumerateDevices();
            } catch (err) {
                  console.error('Camera error:', err);
                  setError(err.message);
                  setIsActive(false);
            }
      }, [facingMode, enumerateDevices]);

      useEffect(() => {
            startCamera(selectedVideoId, selectedAudioId);

            return () => {
                  if (streamRef.current) {
                        streamRef.current.getTracks().forEach(t => t.stop());
                  }
            };
      }, []);


      const playAudioQueue = useCallback(async () => {
            if (isPlayingRef.current) return;
            isPlayingRef.current = true;

            while (audioQueueRef.current.length > 0) {
                  const base64Data = audioQueueRef.current.shift();
                  try {
                        if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
                              playbackContextRef.current = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
                        }


                        const binaryStr = atob(base64Data);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                              bytes[i] = binaryStr.charCodeAt(i);
                        }


                        const int16 = new Int16Array(bytes.buffer);
                        const float32 = new Float32Array(int16.length);
                        for (let i = 0; i < int16.length; i++) {
                              float32[i] = int16[i] / 32768.0;
                        }

                        const audioBuffer = playbackContextRef.current.createBuffer(
                              1,
                              float32.length,
                              PLAYBACK_SAMPLE_RATE
                        );
                        audioBuffer.copyToChannel(float32, 0);

                        const source = playbackContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(playbackContextRef.current.destination);

                        await new Promise((resolve) => {
                              source.onended = resolve;
                              source.start();
                        });
                  } catch (err) {
                        console.error('Audio playback error:', err);
                  }
            }

            isPlayingRef.current = false;
      }, []);


      const startSession = useCallback(() => {
            if (wsRef.current) return;
            if (!streamRef.current) {
                  console.error('No media stream available');
                  return;
            }

            setGeminiStatus('connecting');

            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                  console.log('WebSocket connected to server');
            };

            ws.onmessage = (event) => {
                  try {
                        const msg = JSON.parse(event.data);

                        if (msg.type === 'status' && msg.status === 'connected') {
                              setGeminiStatus('connected');
                              setSessionActive(true);
                              startAudioCapture();
                              startVideoCapture();
                        } else if (msg.type === 'audio' && msg.data) {
                              audioQueueRef.current.push(msg.data);
                              playAudioQueue();
                        } else if (msg.type === 'interrupted') {

                              audioQueueRef.current.length = 0;
                        } else if (msg.type === 'error') {
                              console.error('Server error:', msg.message);
                        }
                  } catch (err) {
                        console.error('Failed to parse server message:', err);
                  }
            };

            ws.onerror = (err) => {
                  console.error('WebSocket error:', err);
                  setGeminiStatus('disconnected');
            };

            ws.onclose = () => {
                  console.log('WebSocket disconnected');
                  setGeminiStatus('disconnected');
                  setSessionActive(false);
                  wsRef.current = null;
                  stopCapture();
            };
      }, [playAudioQueue]);


      const stopSession = useCallback(() => {
            stopCapture();

            if (wsRef.current) {
                  wsRef.current.close();
                  wsRef.current = null;
            }

            setSessionActive(false);
            setGeminiStatus('disconnected');
            audioQueueRef.current.length = 0;
      }, []);


      const startAudioCapture = useCallback(() => {
            if (!streamRef.current) return;

            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (!audioTrack) {
                  console.error('No audio track found');
                  return;
            }

            const audioStream = new MediaStream([audioTrack]);
            audioContextRef.current = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
            const source = audioContextRef.current.createMediaStreamSource(audioStream);
            sourceRef.current = source;


            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                  const inputData = e.inputBuffer.getChannelData(0);


                  const int16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  }


                  const bytes = new Uint8Array(int16.buffer);
                  let binary = '';
                  for (let i = 0; i < bytes.length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                  }
                  const base64 = btoa(binary);

                  wsRef.current.send(JSON.stringify({
                        type: 'audio',
                        data: base64,
                  }));
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
      }, []);


      const startVideoCapture = useCallback(() => {
            const canvas = document.createElement('canvas');

            videoCaptureRef.current = setInterval(() => {
                  if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                  const video = videoRef.current;

                  canvas.width = 640;
                  canvas.height = 480;

                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                  const base64 = dataUrl.split(',')[1];

                  wsRef.current.send(JSON.stringify({
                        type: 'video',
                        data: base64,
                  }));
            }, VIDEO_CAPTURE_INTERVAL);
      }, []);


      const stopCapture = useCallback(() => {
            if (processorRef.current) {
                  processorRef.current.disconnect();
                  processorRef.current = null;
            }
            if (sourceRef.current) {
                  sourceRef.current.disconnect();
                  sourceRef.current = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                  audioContextRef.current.close();
                  audioContextRef.current = null;
            }
            if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
                  playbackContextRef.current.close();
                  playbackContextRef.current = null;
            }
            if (videoCaptureRef.current) {
                  clearInterval(videoCaptureRef.current);
                  videoCaptureRef.current = null;
            }
      }, []);


      useEffect(() => {
            return () => {
                  stopSession();
            };
      }, [stopSession]);

      const handleVideoChange = (e) => {
            const id = e.target.value;
            setSelectedVideoId(id);
            startCamera(id, selectedAudioId);
      };

      const handleAudioChange = (e) => {
            const id = e.target.value;
            setSelectedAudioId(id);
            startCamera(selectedVideoId, id);
      };

      const toggleFacingMode = () => {
            const next = facingMode === 'user' ? 'environment' : 'user';
            setFacingMode(next);
            startCamera('', selectedAudioId);
      };

      const trimLabel = (label, idx, kind) => {
            if (!label) return `${kind} ${idx + 1}`;
            return label.length > 30 ? label.slice(0, 28) + '…' : label;
      };

      const statusColor = geminiStatus === 'connected'
            ? 'bg-emerald-400'
            : geminiStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-white/30';

      return (
            <div className="relative w-screen h-screen overflow-hidden bg-black">
                  <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                  />

                  {error && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                              <div className="text-center px-8">
                                    <svg className="mx-auto mb-4 w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.97L13.74 4.03a2 2 0 00-3.48 0L3.33 16.03A2 2 0 005.07 19z" />
                                    </svg>
                                    <p className="text-white/70 text-sm">{error}</p>
                              </div>
                        </div>
                  )}

                  {!isActive && !error && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                  )}


                  {!isStreaming && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
                              <div className="text-center px-8">
                                    <svg className="mx-auto mb-4 w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                d="M12 9v3m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.97L13.74 4.03a2 2 0 00-3.48 0L3.33 16.03A2 2 0 005.07 19z" />
                                    </svg>
                                    <h1 className="text-white/70 text-2xl">Please check your connection.</h1>

                                    <button
                                          onClick={() => window.location.reload()}
                                          className="mt-4 px-4 py-2 bg-white text-black rounded-lg"
                                    >
                                          Retry
                                    </button>
                              </div>
                        </div>
                  )}


                  <div
                        className="absolute top-0 left-0 right-0 z-30"
                        style={{
                              background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 60%, transparent 100%)',
                        }}
                  >
                        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-10">

                              <div className="flex items-center gap-3 flex-wrap justify-center">
                                    <div className="flex items-center gap-1.5">
                                          <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                                          </svg>
                                          <select
                                                value={selectedVideoId}
                                                onChange={handleVideoChange}
                                                className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none
                                                           backdrop-blur-sm border border-white/10 cursor-pointer
                                                           hover:bg-white/15 transition-colors max-w-[180px]"
                                          >
                                                {videoDevices.map((d, i) => (
                                                      <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900 text-white">
                                                            {trimLabel(d.label, i, 'Camera')}
                                                      </option>
                                                ))}
                                          </select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                          <svg className="w-4 h-4 text-white/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                      d="M19 11a7 7 0 01-14 0M12 19v2m-3 0h6M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" />
                                          </svg>
                                          <select
                                                value={selectedAudioId}
                                                onChange={handleAudioChange}
                                                className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none
                                                           backdrop-blur-sm border border-white/10 cursor-pointer
                                                           hover:bg-white/15 transition-colors max-w-[180px]"
                                          >
                                                {audioDevices.map((d, i) => (
                                                      <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900 text-white">
                                                            {trimLabel(d.label, i, 'Mic')}
                                                      </option>
                                                ))}
                                          </select>
                                    </div>
                              </div>

                              <button
                                    onClick={toggleFacingMode}
                                    title="Switch camera"
                                    className="shrink-0 p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10
                                               hover:bg-white/20 transition-colors cursor-pointer"
                              >
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                d="M4 4v5h5M20 20v-5h-5M7.5 19.8A9 9 0 0021 12M3 12a9 9 0 0013.5-7.8" />
                                    </svg>
                              </button>
                        </div>
                  </div>


                  <div
                        className="absolute bottom-0 left-0 right-0 z-30"
                        style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
                        }}
                  >
                        <div className="flex items-center justify-center gap-4 px-5 pb-10 pt-16">

                              <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                                    <span className="text-white/60 text-xs uppercase tracking-wider">
                                          {geminiStatus === 'connected' ? 'Live' : geminiStatus === 'connecting' ? 'Connecting…' : 'Offline'}
                                    </span>
                              </div>


                              <button
                                    onClick={sessionActive ? stopSession : startSession}
                                    disabled={geminiStatus === 'connecting'}
                                    className={`
                                          px-6 py-3 rounded-full text-sm font-semibold tracking-wide
                                          transition-all duration-200 cursor-pointer
                                          ${sessionActive
                                                ? 'bg-red-500/90 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
                                                : 'bg-white/90 hover:bg-white text-black shadow-lg shadow-white/25'
                                          }
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                          backdrop-blur-sm
                                    `}
                              >
                                    {sessionActive ? '⏹ Stop Session' : '🎙 Start Session'}
                              </button>
                        </div>
                  </div>
            </div>
      );
};

export default Camera;