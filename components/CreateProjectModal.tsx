'use client';

import { useState } from 'react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectData: { title: string; category: string }) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<{ projectName?: string; category?: string }>({});

  if (!isOpen) {
    return null;
  }

  const validateForm = () => {
    const newErrors: { projectName?: string; category?: string } = {};
    
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }
    
    if (!category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onCreateProject({ title: projectName, category });
      setProjectName('');
      setCategory('');
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">Start a new creative project and invite your team to collaborate.</p>

        <div className="mb-4">
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="projectName"
            className={`w-full px-3 py-2 border ${errors.projectName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              if (errors.projectName) {
                setErrors({ ...errors, projectName: undefined });
              }
            }}
            required
          />
          {errors.projectName && (
            <p className="mt-1 text-sm text-red-500">{errors.projectName}</p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            className={`w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (errors.category) {
                setErrors({ ...errors, category: undefined });
              }
            }}
            required
          >
            <option value="">Select category</option>
            <option value="video">Video</option>
            <option value="design">Design</option>
            <option value="development">Development</option>
            <option value="planning">Planning</option>
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-500">{errors.category}</p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full px-6 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600"
        >
          Create Project
        </button>
      </div>
    </div>
  );
} 