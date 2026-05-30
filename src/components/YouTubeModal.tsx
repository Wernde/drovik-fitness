import { useEffect } from 'react'

interface Props {
  videoId: string
  title: string
  onClose: () => void
}

export default function YouTubeModal({ videoId, title, onClose }: Props) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-auto bg-black rounded-t-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900">
          <div className="w-6 h-1 rounded-full bg-gray-600 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <p className="text-white text-sm font-semibold truncate flex-1 pr-2 mt-1">{title}</p>
          <button
            onClick={onClose}
            className="text-gray-400 p-1 active:text-white flex-shrink-0"
            aria-label="Close video"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 16:9 embed */}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Bottom safe-area padding */}
        <div className="h-6 bg-black" />
      </div>
    </div>
  )
}
