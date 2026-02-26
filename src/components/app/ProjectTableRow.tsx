'use client'

import { useRouter } from 'next/navigation'

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

const surveyStatusColors: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-600',
  published: 'bg-green-50 text-green-600',
  closed: 'bg-gray-50 text-gray-600',
}

interface ProjectRowProps {
  project: {
    id: string
    client_name: string
    industry: string | null
    goal: string | null
    status: string
    created_at: string
    survey_status: string | null
    survey_count: number
  }
}

export default function ProjectRow({ project }: ProjectRowProps) {
  const router = useRouter()

  return (
    <tr 
      onClick={() => router.push(`/app/projects/${project.id}`)}
      className="hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <td className="px-6 py-4 font-medium text-gray-900">{project.client_name}</td>
      <td className="px-6 py-4 text-gray-500">{project.industry ?? '—'}</td>
      <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{project.goal ?? '—'}</td>
      <td className="px-6 py-4">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[project.status] ?? ''}`}>
          {project.status}
        </span>
      </td>
      <td className="px-6 py-4">
        {project.survey_status ? (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${surveyStatusColors[project.survey_status] ?? ''}`}>
            {project.survey_status}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-center text-gray-700 font-medium">
        {project.survey_count > 0 ? project.survey_count : '—'}
      </td>
      <td className="px-6 py-4 text-gray-400 text-xs">
        {new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
      </td>
    </tr>
  )
}
