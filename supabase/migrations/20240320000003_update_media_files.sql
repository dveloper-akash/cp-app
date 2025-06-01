-- Update media_files table to include Cloudinary fields
ALTER TABLE media_files
ADD COLUMN cloudinary_public_id TEXT,
ADD COLUMN cloudinary_url TEXT,
ADD COLUMN resource_type TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_files_cloudinary_public_id ON media_files(cloudinary_public_id);
CREATE INDEX IF NOT EXISTS idx_media_files_resource_type ON media_files(resource_type); 