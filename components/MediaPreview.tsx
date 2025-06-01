import { useState } from 'react';
import { FaPlay, FaFile, FaFilePdf } from 'react-icons/fa';

interface MediaPreviewProps {
  url: string;
  type: string;
  fileName: string;
}

export default function MediaPreview({ url, type, fileName }: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const renderPreview = () => {
    if (type.startsWith('image/')) {
      return (
        <div className="relative group">
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-64 rounded-lg object-contain"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <span className="text-white text-sm font-medium">View full size</span>
          </a>
        </div>
      );
    }

    if (type.startsWith('video/')) {
      return (
        <div className="relative">
          {isPlaying ? (
            <video
              src={url}
              controls
              className="max-w-full max-h-64 rounded-lg"
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <div
              className="relative cursor-pointer group"
              onClick={() => setIsPlaying(true)}
            >
              <video
                src={url}
                className="max-w-full max-h-64 rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-opacity">
                <FaPlay className="w-12 h-12 text-white" />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (type === 'application/pdf') {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <FaFilePdf className="w-6 h-6 text-red-500" />
          <span className="text-sm text-gray-700">{fileName}</span>
        </a>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <FaFile className="w-6 h-6 text-gray-500" />
        <span className="text-sm text-gray-700">{fileName}</span>
      </a>
    );
  };

  return (
    <div className="mt-2">
      {renderPreview()}
    </div>
  );
} 