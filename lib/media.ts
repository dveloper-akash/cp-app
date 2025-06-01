import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { uploadToCloudinary, deleteFromCloudinary, CloudinaryUploadResponse } from './cloudinary';

export interface MediaFile {
  id: string;
  chat_room_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  resource_type: string;
  created_at: string;
}

export async function uploadMediaFile(
  file: File,
  chatRoomId: string
): Promise<MediaFile | null> {
  try {
    const supabase = createClientComponentClient();

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file, `chat-rooms/${chatRoomId}`);
    if (!cloudinaryResult) {
      throw new Error('Failed to upload to Cloudinary');
    }

    // Create media file record in database
    const { data, error } = await supabase
      .from('media_files')
      .insert([{
        chat_room_id: chatRoomId,
        file_name: file.name,
        file_type: file.type,
        file_url: cloudinaryResult.secure_url,
        cloudinary_public_id: cloudinaryResult.public_id,
        cloudinary_url: cloudinaryResult.secure_url,
        resource_type: cloudinaryResult.resource_type
      }])
      .select()
      .single();

    if (error) {
      // If database insert fails, delete from Cloudinary
      await deleteFromCloudinary(cloudinaryResult.public_id);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error uploading media file:', error);
    return null;
  }
}

export async function deleteMediaFile(fileId: string): Promise<boolean> {
  try {
    const supabase = createClientComponentClient();

    // Get the file record first
    const { data: file, error: fetchError } = await supabase
      .from('media_files')
      .select('cloudinary_public_id')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      throw new Error('Failed to fetch media file');
    }

    // Delete from Cloudinary
    if (file.cloudinary_public_id) {
      const cloudinaryDeleted = await deleteFromCloudinary(file.cloudinary_public_id);
      if (!cloudinaryDeleted) {
        throw new Error('Failed to delete from Cloudinary');
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('media_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw deleteError;
    }

    return true;
  } catch (error) {
    console.error('Error deleting media file:', error);
    return false;
  }
}

export async function getMediaFiles(chatRoomId: string): Promise<MediaFile[]> {
  try {
    const supabase = createClientComponentClient();

    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching media files:', error);
    return [];
  }
} 