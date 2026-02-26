'use client'

import { useState } from 'react'
import EditProjectModal from './ProjectEditDialog'
import DeleteProjectButton from './ProjectRemovalControl'
import { useCan } from './UserProfileProvider'
import type { Database } from '@/types/DatabaseSchemaDefinitions'

type Project = Database['public']['Tables']['projects']['Row']

interface Props {
  project: Project
}

export default function ProjectActions({ project }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const canEdit = useCan('editProject')
  const canDelete = useCan('deleteProject')

  if (!canEdit && !canDelete) return null

  return (
    <>
      <div className="flex gap-3">
        {canEdit && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Project
          </button>
        )}
        {canDelete && (
          <DeleteProjectButton 
            projectId={project.id} 
            projectName={project.client_name}
            currentStatus={project.status}
          />
        )}
      </div>

      {canEdit && (
        <EditProjectModal
          project={project}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </>
  )
}
