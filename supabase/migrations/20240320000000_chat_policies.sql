-- Enable Row Level Security (RLS)
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chat rooms they have access to" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms for their projects" ON chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chat rooms" ON messages;
DROP POLICY IF EXISTS "Users can view media files in their chat rooms" ON media_files;
DROP POLICY IF EXISTS "Users can upload media files in their chat rooms" ON media_files;

-- Create new policies
CREATE POLICY "Users can view chat rooms they have access to"
ON chat_rooms FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = chat_rooms.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chat rooms for their projects"
ON chat_rooms FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = chat_rooms.project_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their chat rooms"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    JOIN projects ON projects.id = chat_rooms.project_id
    WHERE chat_rooms.id = messages.chat_room_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their chat rooms"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms
    JOIN projects ON projects.id = chat_rooms.project_id
    WHERE chat_rooms.id = messages.chat_room_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view media files in their chat rooms"
ON media_files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    JOIN projects ON projects.id = chat_rooms.project_id
    WHERE chat_rooms.id = media_files.chat_room_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload media files in their chat rooms"
ON media_files FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms
    JOIN projects ON projects.id = chat_rooms.project_id
    WHERE chat_rooms.id = media_files.chat_room_id
    AND projects.user_id = auth.uid()
  )
); 