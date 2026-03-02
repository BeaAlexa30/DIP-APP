'use client'

import { Button } from '@/components/ui/button'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import { useState } from 'react'
import EditProjectModal from './ProjectEditDialog'
import ArchiveProjectButton from './ProjectRemovalControl'
import { useCan } from './UserProfileProvider'

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
          <Button
            onClick={() => setIsEditOpen(true)}
            className="rounded-lg"
          >
            Edit Project
          </Button>
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
