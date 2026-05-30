/**
 * Extracts a YouTube video ID from any common YouTube URL format.
 * Returns null if the URL is not a recognised YouTube link.
 */
export function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/)
      if (shorts) return shorts[1]
    }
    return null
  } catch {
    return null
  }
}

/** Returns a medium-quality thumbnail URL (320×180) for a YouTube video ID. */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}
