-- Create project_members table
CREATE TABLE IF NOT EXISTS project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create policy for project_members
CREATE POLICY "Users can view their project memberships"
ON project_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update chat room policies to check project membership
DROP POLICY IF EXISTS "Users can view chat rooms they have access to" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms for their projects" ON chat_rooms;

CREATE POLICY "Users can view chat rooms they have access to"
ON chat_rooms FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE p.id = chat_rooms.project_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create chat rooms for their projects"
ON chat_rooms FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE p.id = chat_rooms.project_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Update message policies
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chat rooms" ON messages;

CREATE POLICY "Users can view messages in their chat rooms"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN projects p ON p.id = cr.project_id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE cr.id = messages.chat_room_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their chat rooms"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN projects p ON p.id = cr.project_id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE cr.id = messages.chat_room_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Update media file policies
DROP POLICY IF EXISTS "Users can view media files in their chat rooms" ON media_files;
DROP POLICY IF EXISTS "Users can upload media files in their chat rooms" ON media_files;

CREATE POLICY "Users can view media files in their chat rooms"
ON media_files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN projects p ON p.id = cr.project_id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE cr.id = media_files.chat_room_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can upload media files in their chat rooms"
ON media_files FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    JOIN projects p ON p.id = cr.project_id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE cr.id = media_files.chat_room_id
    AND (p.user_id = auth.uid() OR pm.user_id = auth.uid())
  )
); 