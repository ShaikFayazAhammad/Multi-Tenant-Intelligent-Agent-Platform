import React, { useRef, useState } from 'react';
import { X, FileVideo, ExternalLink } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  videoSrc: string;
  fallbackPoster?: string;
  keyPoints?: string[];
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  videoSrc,
  fallbackPoster,
  keyPoints,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState(false);

  if (!isOpen) return null;

  const isGDrive = videoSrc.includes('drive.google.com');
  const embedSrc = isGDrive
    ? videoSrc.includes('/preview')
      ? videoSrc
      : videoSrc.replace(/\/view(\?.*)?$/, '/preview')
    : videoSrc;
  const driveDirectLink = isGDrive
    ? videoSrc.includes('/preview')
      ? videoSrc.replace('/preview', '/view?usp=sharing')
      : videoSrc
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-3xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
          <div className="flex items-center space-x-2">
            {driveDirectLink && (
              <a
                href={driveDirectLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-slate-700/60 hover:bg-slate-700 transition-colors"
                title="Open directly in Google Drive"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Close video player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Screen */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {isGDrive ? (
            <iframe
              src={embedSrc}
              title={title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          ) : !videoError ? (
            <video
              ref={videoRef}
              src={videoSrc}
              poster={fallbackPoster}
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="p-8 text-center max-w-lg space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
                <FileVideo className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Video Attachment Slot Ready</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Drop your recorded demo video file into the project directory at:
                <br />
                <code className="text-cyan-300 bg-slate-800 px-2 py-1 rounded text-[11px] mt-1 inline-block">
                  frontend/landing-page/public{videoSrc}
                </code>
              </p>
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-left text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-white">This video block demonstrates:</div>
                {keyPoints?.map((pt, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>BFSI Multi-Tenant Intelligent Agent Platform Demo Player</span>
          <span className="text-cyan-400 font-mono">Cloud Stream • 1080p</span>
        </div>

      </div>
    </div>
  );
};
