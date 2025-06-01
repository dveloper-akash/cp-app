import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export async function addProjectMember(projectId: string, userId: string, role: string = 'member'): Promise<ProjectMember | null> {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('project_members')
    .insert([{
      project_id: projectId,
      user_id: userId,
      role: role
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding project member:', error);
    return null;
  }

  return data;
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const supabase = createClientComponentClient();
  
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error getting project members:', error);
    return [];
  }

  return data || [];
}

export async function removeProjectMember(projectId: string, userId: string): Promise<boolean> {
  const supabase = createClientComponentClient();
  
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing project member:', error);
    return false;
  }

  return true;
} 