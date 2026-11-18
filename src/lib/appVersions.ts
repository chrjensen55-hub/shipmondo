// The published tablet app versions, read from the GitHub releases of this repository. Used by the
// download page and by the Message Center (for the "new version" message and to show which
// locations run an older version).
const RELEASES_API_URL = 'https://api.github.com/repos/chrjensen55-hub/shipmondo/releases?per_page=100'
export const RELEASES_PAGE_URL = 'https://github.com/chrjensen55-hub/shipmondo/releases'

type GitHubAsset = { name: string; browser_download_url: string; size: number }
type GitHubRelease = { tag_name: string; name: string | null; published_at: string; draft: boolean; prerelease: boolean; assets: GitHubAsset[] }

export type AppVersion = { tag: string; version: string; title: string; publishedAt: string; downloadUrl: string; sizeBytes: number }

// Newest first. An empty list means GitHub could not be reached; callers show that plainly.
export async function getAppVersions(): Promise<AppVersion[]> {
  try {
    const res = await fetch(RELEASES_API_URL, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const releases = (await res.json()) as GitHubRelease[]
    return releases
      .filter((r) => !r.draft && r.tag_name.startsWith('mobile-v'))
      .map((r) => {
        const apk = r.assets.find((a) => a.name.endsWith('.apk'))
        return apk ? { tag: r.tag_name, version: r.tag_name.replace('mobile-v', ''), title: r.name ?? r.tag_name, publishedAt: r.published_at, downloadUrl: apk.browser_download_url, sizeBytes: apk.size } : null
      })
      .filter((v): v is AppVersion => v !== null)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  } catch {
    return []
  }
}

// True when `current` is an older version than `latest` ("1.9.0" vs "1.10.0"). Unknown or
// malformed versions are never reported as outdated.
export function isOlderVersion(current: string, latest: string): boolean {
  const parse = (v: string) => (/^\d+(\.\d+)*$/.test(v) ? v.split('.').map(Number) : null)
  const a = parse(current)
  const b = parse(latest)
  if (!a || !b) return false
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff < 0
  }
  return false
}
