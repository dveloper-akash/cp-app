import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { uploadToCloudinary } from './cloudinary';

export interface ChatRoom {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_file_id?: string | null;
  media_files?: MediaFile | null;
}

export interface MediaFile {
  id: string;
  chat_room_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
  cloudinary_public_id?: string;
  cloudinary_url?: string;
  resource_type?: string;
}

export async function createChatRoom(projectId: string): Promise<ChatRoom | null> {
  if (!projectId) {
    console.error('Project ID is required');
    return null;
  }

  const supabase = createClientComponentClient();
  
  // Verify project exists and user has access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error('Error checking project:', projectError);
    return null;
  }

  if (!project) {
    console.error('Project not found:', projectId);
    return null;
  }

  console.log('Project found:', project);

  // First check if chat room already exists
  const { data: existingRoom } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (existingRoom) {
    console.log('Chat room already exists:', existingRoom);
    return existingRoom as ChatRoom;
  }

  // Create new chat room
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    // Log the raw error object
    console.error('Raw error object:', JSON.stringify(error, null, 2));
    
    // Check for specific error types
    if (error.code === '23505') {
      console.error('Duplicate chat room entry');
    } else if (error.code === '23503') {
      console.error('Foreign key violation - project does not exist');
    } else if (error.code === '42501') {
      console.error('Permission denied - check RLS policies');
    }
    
    return null;
  }

  return data;
}

export async function getChatRoom(projectId: string): Promise<ChatRoom | null> {
  const supabase = createClientComponentClient();
  
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is expected when no chat room exists
        return null;
      }
      console.error('Error getting chat room:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getChatRoom:', error);
    return null;
  }
}

export async function sendMessage(chatRoomId: string, content: string, userId: string, mediaFileId?: string | null): Promise<Message | null> {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      chat_room_id: chatRoomId,
      user_id: userId,
      content: content,
      media_file_id: mediaFileId
    }])
    .select('*, media_files(*)')
    .single();

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return data as Message;
}

export async function uploadMediaFile(chatRoomId: string, file: File): Promise<MediaFile | null> {
  const supabase = createClientComponentClient();
  
  try {
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(file, `chat-rooms/${chatRoomId}`);
    if (!cloudinaryResult) {
      throw new Error('Failed to upload to Cloudinary');
    }

    // Create media file record in Supabase
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
      console.error('Error creating media file record:', error);
      return null;
    }

    return data as MediaFile;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

export async function getMessages(chatRoomId: string): Promise<Message[]> {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*, media_files(*)')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting messages:', error);
    return [];
  }

  return (data as Message[]) || [];
}

export async function getMediaFiles(chatRoomId: string): Promise<MediaFile[]> {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting media files:', error);
    return [];
  }

  return data as MediaFile[] || [];
} 