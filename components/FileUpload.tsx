import { useState, useRef } from 'react';
import { FaPaperclip, FaSpinner } from 'react-icons/fa';
import { uploadMediaFile, type MediaFile as DBMediaFile } from '@/lib/media';

interface FileUploadProps {
  chatRoomId: string;
  onUploadComplete: (mediaFile: DBMediaFile) => void;
  onUploadError: (error: string) => void;
}

export default function FileUpload({ chatRoomId, onUploadComplete, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onUploadError('File size must be less than 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    try {
      const mediaFile = await uploadMediaFile(file, chatRoomId);
      if (mediaFile) {
        onUploadComplete(mediaFile);
      } else {
        onUploadError('Failed to upload file');
      }
    } catch (error) {
      onUploadError('Error uploading file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,application/pdf"
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach file"
      >
        {isUploading ? (
          <FaSpinner className="w-5 h-5 animate-spin" />
        ) : (
          <FaPaperclip className="w-5 h-5" />
        )}
      </button>
    </div>
  );
} 