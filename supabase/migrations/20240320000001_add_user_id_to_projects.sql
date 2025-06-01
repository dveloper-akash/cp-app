-- Add user_id column to projects table
ALTER TABLE projects 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update existing projects to have a default user (optional)
-- You might want to update this with actual user IDs
UPDATE projects 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id required for new projects
ALTER TABLE projects 
ALTER COLUMN user_id SET NOT NULL; 