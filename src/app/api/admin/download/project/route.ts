import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import archiver from 'archiver'
import path from 'path'
import fs from 'fs'

// Folders / file prefixes to exclude
const EXCLUDE_NAMES = new Set([
  'node_modules', '.next', '.git', '.turbo', 'out', 'dist', 'build',
])

function shouldExclude(name: string): boolean {
  return EXCLUDE_NAMES.has(name) || name.startsWith('.env')
}

/** Collect all eligible file paths recursively */
function collectFiles(dir: string, baseInZip: string, result: Array<{ abs: string; rel: string }>) {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return // skip unreadable dirs (e.g. locked .next internals)
  }

  for (const entry of entries) {
    if (shouldExclude(entry.name)) continue
    const abs = path.join(dir, entry.name)
    const rel = baseInZip ? `${baseInZip}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      collectFiles(abs, rel, result)
    } else if (entry.isFile()) {
      result.push({ abs, rel })
    }
  }
}

export async function GET(_req: NextRequest) {
  const perm = await requirePermission('manageSettings')
  if (!perm.ok) return perm.response

  try {
    const projectRoot = path.resolve(process.cwd())

    // Collect files first so archiver doesn't race with Next.js file writes
    const files: Array<{ abs: string; rel: string }> = []
    collectFiles(projectRoot, '', files)

    // Buffer the zip entirely in memory before responding
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      const archive = archiver('zip', { zlib: { level: 5 } })

      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      for (const { abs, rel } of files) {
        try {
          archive.file(abs, { name: rel })
        } catch {
          // skip files that can't be read at this moment
        }
      }

      archive.finalize()
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="dip-app.zip"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[download/project]', err)
    return NextResponse.json({ error: 'Failed to create zip' }, { status: 500 })
  }
}
