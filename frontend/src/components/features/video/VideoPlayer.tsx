import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Download, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from "react-i18next";

interface VideoPlayerProps {
    recordingId: string;
    autoPlay?: boolean;
    onEnded?: () => void;
}

interface Recording {
    id: string;
    title?: string;
    file_url: string;
    thumbnail_url?: string;
    duration: number;
    file_size: number;
    created_at: string;
}

export function VideoPlayer({ recordingId, autoPlay = false, onEnded }: VideoPlayerProps) {
  const { t } = useTranslation();
    const [recording, setRecording] = useState<Recording | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadRecording = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/v1/video/enhanced/recordings/${recordingId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load recording');
            }

            const data = await response.json();
            setRecording(data.recording);
            setDuration(data.recording.duration);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load recording');
        } finally {
            setLoading(false);
        }
    }, [recordingId]);

    useEffect(() => {
        loadRecording();
    }, [loadRecording]);

    useEffect(() => {
        if (autoPlay && videoRef.current) {
            videoRef.current.play();
        }
    }, [autoPlay]);

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setDuration(videoRef.current.duration);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const vol = parseFloat(e.target.value);
        videoRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const handleFullscreen = () => {
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(`/api/v1/video/enhanced/recordings/${recordingId}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get download URL');
            }

            const data = await response.json();
            window.open(data.download_url, '_blank');
        } catch (err) {
            console.error('Download error:', err);
        }
    };

    const handleTranscribe = async () => {
        try {
            const response = await fetch(`/api/v1/video/enhanced/recordings/${recordingId}/transcribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recording_id: recordingId,
                    language: 'en'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start transcription');
            }

            alert('Transcription started. You will be notified when it\'s ready.');
        } catch (err) {
            console.error('Transcription error:', err);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    if (loading) {
        return (
            <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center">
                <div className="text-white">{t('components.video_player.loading', "Loading...")}</div>
            </div>
        );
    }

    if (error || !recording) {
        return (
            <div className="bg-slate-900 rounded-lg aspect-video flex items-center justify-center">
                <div className="text-red-400">{error || 'Recording not found'}</div>
            </div>
        );
    }

    return (
        <div
            className="relative bg-slate-900 rounded-lg overflow-hidden group"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="w-full aspect-video"
                poster={recording.thumbnail_url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    setIsPlaying(false);
                    onEnded?.();
                }}
                onClick={togglePlay}
            >
                <source src={recording.file_url} type="video/mp4" />{t('components.video_player.your_browser_does_not_1', "Your browser does not support the video tag.")}</video>

            {/* Play/Pause Overlay */}
            {!isPlaying && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/50 cursor-pointer"
                    onClick={togglePlay}
                >
                    <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-10 h-10 text-slate-900 ml-1" />
                    </div>
                </motion.div>
            )}

            {/* Controls */}
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: showControls ? 1 : 0 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-4"
            >
                {/* Progress Bar */}
                <div className="mb-4">
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${(currentTime / duration) * 100}%, #475569 ${(currentTime / duration) * 100}%, #475569 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-white mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Play/Pause */}
                        <button
                            onClick={togglePlay}
                            className="text-white hover:text-indigo-400 transition-colors"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="text-white hover:text-indigo-400 transition-colors"
                                aria-label={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Download */}
                        <button
                            onClick={handleDownload}
                            className="text-white hover:text-indigo-400 transition-colors"
                            aria-label={t('components.video_player.download_aria-label_2', "Download")}
                            title={t('components.video_player.download_recording_title_3', "Download recording")}
                        >
                            <Download className="w-5 h-5" />
                        </button>

                        {/* Transcribe */}
                        <button
                            onClick={handleTranscribe}
                            className="text-white hover:text-indigo-400 transition-colors"
                            aria-label={t('components.video_player.transcribe_aria-label_4', "Transcribe")}
                            title={t('components.video_player.generate_transcription_title_5', "Generate transcription")}
                        >
                            <FileText className="w-5 h-5" />
                        </button>

                        {/* Fullscreen */}
                        <button
                            onClick={handleFullscreen}
                            className="text-white hover:text-indigo-400 transition-colors"
                            aria-label={t('components.video_player.fullscreen_aria-label_6', "Fullscreen")}
                        >
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Recording Info */}
            {recording.title && (
                <div className="absolute top-4 left-4 bg-slate-900/80 px-4 py-2 rounded-lg">
                    <h3 className="text-white font-medium">{recording.title}</h3>
                </div>
            )}
        </div>
    );
}
