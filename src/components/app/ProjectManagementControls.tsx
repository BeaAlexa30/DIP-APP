'use client'

import { useState } from 'react'
import EditProjectModal from './ProjectEditDialog'
import ArchiveProjectButton from './ProjectRemovalControl'
import { useCan } from './UserProfileProvider'
import type { Database } from '@/types/DatabaseSchemaDefinitions'

type Project = Database['public']['Tables']['projects']['Row']

interface Props {
  project: Project
  surveyCount?: number
}

export default function ProjectActions({ project, surveyCount }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const canEdit = useCan('editProject')
  const canArchive = useCan('deleteProject')  // deleteProject = Admin only

  if (!canEdit && !canArchive) return null

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
        {canArchive && (
          <ArchiveProjectButton
            projectId={project.id}
            projectName={project.client_name}
            currentStatus={project.status}
            surveyCount={surveyCount}
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
