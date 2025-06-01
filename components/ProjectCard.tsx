'use client';

import { useState, useRef, useEffect } from 'react';
import { FaEllipsisV } from 'react-icons/fa'; // Assuming react-icons is available
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: {
    id: string; // Assuming each project has a unique ID
    title: string;
    category: string;
    status: 'active' | 'completed';
    members: number;
    lastActivity: string;
    isPaid?: boolean; // Optional paid/unpaid status
    // Add other project properties as needed (e.g., icon data, though using placeholders for now)
    iconBgColor: string;
    iconTextColor: string;
    iconPath: string; // Placeholder for SVG path or icon component 'd' attribute
    statusBgColor: string;
    statusTextColor: string;
  };
  onDelete: (id: string) => void; // Callback function for deletion
}

export default function ProjectCard({
  project,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const supabase = createClientComponentClient();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClick = () => {
    if (confirm(`Are you sure you want to delete "${project.title}"?`)) {
      onDelete(project.id);
    }
    setIsMenuOpen(false); // Close menu after action
  };

  const handleDetailsClick = () => {
    router.push(`/projects/${project.id}`);
    setIsMenuOpen(false); // Close menu after action
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on the menu button or menu items
    if ((e.target as HTMLElement).closest('.menu-button') || (e.target as HTMLElement).closest('.menu-items')) {
      return;
    }
    router.push(`/projects/${project.id}`);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'design':
        return 'bg-blue-100 text-blue-800';
      case 'development':
        return 'bg-green-100 text-green-800';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'video':
        return '🎥';
      case 'design':
        return '🎨';
      case 'development':
        return '💻';
      case 'planning':
        return '📋';
      default:
        return '📁';
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      onDelete(project.id);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className="relative bg-white rounded-xl p-6 shadow-md hover:shadow-2xl transition-shadow duration-300 flex flex-col border border-gray-200 h-52 cursor-pointer"
      >
        {/* Three Dots Menu */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="menu-button p-1 rounded-full hover:bg-gray-100 focus:outline-none"
            aria-label="Project options"
          >
             <FaEllipsisV className="text-gray-400" />
          </button>

          {isMenuOpen && (
            <div
              ref={menuRef}
              className="menu-items absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-1.5 ring-1 ring-gray-200"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDetailsClick();
                }}
                className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Project Card Content */}
        <div className="flex items-center mb-4">
          {/* Placeholder Icon */}
          <div className={`w-10 h-10 rounded-full ${project.iconBgColor} flex items-center justify-center mr-4`}>
             {/* Replace with actual SVG or icon component based on iconPath */}
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${project.iconTextColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d={project.iconPath} />
               </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{project.title}</h2>
            <p className="text-sm text-gray-500">{project.category}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.statusBgColor} ${project.statusTextColor}`}>{project.status}</span>
          </div>
          <span>{project.members} members</span>
        </div>

        <div className="flex justify-between items-center text-xs text-gray-500 mt-auto">
          <p>Last activity: {project.lastActivity}</p>
          {project.isPaid !== undefined && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.isPaid ? 'bg-blue-100 text-blue-800' : 'bg-red-50 text-red-600'}`}>
              {project.isPaid ? 'Paid' : 'Unpaid'}
            </span>
          )}
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        projectName={project.title}
      />
    </>
  );
}