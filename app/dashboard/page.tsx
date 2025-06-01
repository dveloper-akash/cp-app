'use client';

import { useState, useEffect } from 'react';
// Remove server-side imports
// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
// import { redirect } from 'next/navigation';

import UserMenu from '@/components/UserMenu';
import NotificationMenu from '@/components/NotificationMenu';
import ProjectCard from '@/components/ProjectCard'; // Import the new ProjectCard component
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CreateProjectModal from '@/components/CreateProjectModal'; // Import the modal component
import { addProjectMember } from '@/lib/projects';

// Define a type for project data to match ProjectCardProps
interface Project {
  id: string;
  title: string;
  category: string;
  status: 'active' | 'completed';
  members: number;
  lastActivity: string;
  isPaid: boolean;
  iconBgColor: string;
  iconTextColor: string;
  iconPath: string;
  statusBgColor: string;
  statusTextColor: string;
}

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Function to get styling based on category
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'design':
        return {
          iconBgColor: 'bg-purple-100',
          iconTextColor: 'text-purple-800',
          iconPath: 'M15 15l-1 9m9-9l-9 1m1-9l9 1m-9 9l-1 9M4.578 14.578l-.911.911m1.64-.911l.91.911M.859 11.141l-.911-.911m1.64.911l.91-.911M11.141 19.141l-.911-.911m1.64-.911l.91.911M19.141 11.141l-.911-.911m1.64-.911l.91-.911M16 11a4 4 0 11-8 0 4 4 0 018 0z',
          statusBgColor: 'bg-green-100',
          statusTextColor: 'text-green-800',
        };
      case 'development':
        return {
          iconBgColor: 'bg-blue-100',
          iconTextColor: 'text-blue-800',
          iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 4l-4 4 4 4',
          statusBgColor: 'bg-green-100',
          statusTextColor: 'text-green-800',
        };
      case 'video':
        return {
          iconBgColor: 'bg-red-100',
          iconTextColor: 'text-red-800',
          iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
          statusBgColor: 'bg-blue-100',
          statusTextColor: 'text-blue-800',
        };
      case 'planning':
        return {
          iconBgColor: 'bg-yellow-100',
          iconTextColor: 'text-yellow-800',
          iconPath: 'M9 12h6m-3 3v-6M5 10h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2zm0 0v4a2 2 0 002 2h10a2 2 0 002-2v-4m-2 4a2 2 0 01-2 2H7a2 2 0 01-2-2',
          statusBgColor: 'bg-green-100',
          statusTextColor: 'text-green-800',
        };
      default:
        return {
          iconBgColor: 'bg-gray-200',
          iconTextColor: 'text-gray-700',
          iconPath: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
          statusBgColor: 'bg-green-100',
          statusTextColor: 'text-green-800',
        };
    }
  };

  // Function to handle creating a new project
  const handleCreateProject = async (projectData: { title: string; category: string }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      const newProject = {
        id: crypto.randomUUID(),
        title: projectData.title,
        category: projectData.category,
        status: 'active' as const,
        members: [],
        last_activity: new Date().toISOString(),
        is_paid: false,
        created_at: new Date().toISOString(),
        user_id: user.id
      };

      const { error: projectError } = await supabase
        .from('projects')
        .insert([newProject]);

      if (projectError) {
        console.error('Error creating project:', projectError);
        return;
      }

      // Add creator as project member with 'owner' role
      const member = await addProjectMember(newProject.id, user.id, 'owner');
      if (!member) {
        console.error('Error adding project member');
        return;
      }

      const styles = getCategoryStyles(newProject.category);
      const createdProject: Project = {
        id: newProject.id,
        title: newProject.title,
        category: newProject.category,
        status: newProject.status,
        members: newProject.members.length || 1,
        lastActivity: new Date(newProject.last_activity).toLocaleString(),
        isPaid: newProject.is_paid,
        ...styles
      };
      setProjects(prev => [createdProject, ...prev]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error in handleCreateProject:', error);
    }
  };

  // Fetch projects from Supabase when component mounts
  useEffect(() => {
    async function fetchProjects() {
      try {
        console.log('Attempting to fetch projects...');
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          console.error('Full error object:', JSON.stringify(error, null, 2));
          return;
        }

        console.log('Projects fetched successfully:', data);

        if (data) {
          // Transform the data to match our Project interface
          const transformedProjects = data.map(project => {
            const styles = getCategoryStyles(project.category);
            return {
              id: project.id,
              title: project.title,
              category: project.category,
              status: project.status || 'active',
              members: project.members || 1,
              lastActivity: new Date(project.last_activity).toLocaleString(),
              isPaid: project.is_paid || false,
              ...styles
            };
          });
          setProjects(transformedProjects);
        }
      } catch (error) {
        console.error('Error in fetchProjects:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [supabase]);

  // Get user's name from metadata
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.username || user.email;
        setUsername(name);
      } else {
        setUsername('Guest');
      }
    }
    getUser();
  }, [supabase]);

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        return;
      }

      // Update local state after successful deletion
      setProjects(projects.filter(project => project.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#DBDBDB]">
        <div className="text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#DBDBDB] text-gray-800">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#DBDBDB] ">
        <div className="flex items-center gap-4">
          {/* Placeholder for CP Manager logo and text */}
          <div className="text-2xl font-bold text-gray-900">CP Manager</div>
        </div>
        <div className="flex items-center gap-6">
          <NotificationMenu />
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6 flex-grow overflow-y-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-800 mb-6 font-polarity">
          Hi {username || 'Loading...'},
        </h1>

        {/* Create New Project Button */}
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-8 py-3 bg-white text-black font-semibold rounded-lg shadow-md border border-gray-300 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 mb-12"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3h-3a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Project
        </button>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      </main>
      {/* Render the modal */}
      <CreateProjectModal isOpen={isModalOpen} onClose={closeModal} onCreateProject={handleCreateProject} />
    </div>
  );
}
