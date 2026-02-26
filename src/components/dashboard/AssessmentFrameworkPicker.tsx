'use client'

import { useRouter } from 'next/navigation'

interface Survey {
  id: string
  pack_id: string
  pack_version_snapshot: {
    packName: string
    version: string
  }
}

interface FrameworkSelectorProps {
  surveys: Survey[]
  currentSurveyId: string
  projectId: string
}

export default function FrameworkSelector({ surveys, currentSurveyId, projectId }: FrameworkSelectorProps) {
  const router = useRouter()

  if (surveys.length <= 1) {
    return null // Don't show selector if only one survey
  }

  const handleChange = (surveyId: string) => {
    router.push(`/app/projects/${projectId}/dashboard?surveyId=${surveyId}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Framework Survey
      </label>
      <select
        value={currentSurveyId}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {surveys.map((survey) => (
          <option key={survey.id} value={survey.id}>
            {survey.pack_version_snapshot.packName} (v{survey.pack_version_snapshot.version})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-2">
        This project has multiple framework surveys. Select one to view its dashboard.
      </p>
    </div>
  )
}
