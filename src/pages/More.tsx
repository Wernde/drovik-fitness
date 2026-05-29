/**
 * More — AI Coach chat screen.
 */

import { useState, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

interface Message {
  role: 'user' | 'ai'
  text: string
}

export default function More() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hey Dewald! Ready to crush today's workout? Ask me about form, nutrition, recovery, or program adjustments." },
  ])

  const latestWeight = useLiveQuery(async () => {
    const logs = await db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date)))
    return logs[0]?.weight ?? null
  }, [])

  const sysPrompt = [
    'You are an AI fitness coach in the Drovik app for Dewald Van Zyl.',
    latestWeight != null ? `Current weight: ${latestWeight}kg.` : null,
    'Goal: body recomposition.',
    'Keep responses to 3 sentences max — practical and motivating.',
  ].filter(Boolean).join('\n')
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textaRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function getApiKey() {
    return localStorage.getItem('drovik:apiKey') ?? ''
  }

  async function send() {
    const msg = input.trim()
    if (!msg || loading) return

    const key = getApiKey()
    if (!key) {
      setMessages((m) => [...m, { role: 'ai', text: 'No API key set. Go to Settings → AI Coach to add your Anthropic API key.' }])
      setInput('')
      return
    }

    setMessages((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setLoading(true)

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'ai')
      .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
    history.push({ role: 'user', content: msg })

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: sysPrompt,
          messages: history,
        }),
      })
      const data = await res.json()
      const reply = (data.content as Array<{ type: string; text: string }>)
        ?.find((b) => b.type === 'text')?.text ?? 'Something went wrong.'
      setMessages((m) => [...m, { role: 'ai', text: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Connection error. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-screen bg-app-bg" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Top bar */}
      <div className="bg-app-bg px-5 pt-6 pb-3 flex items-center gap-3 border-b border-app-border flex-none">
        <div className="w-11 h-11 rounded-full bg-app-text flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-accent">
            <path d="M16.5 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 21a3 3 0 00.364-5.982A3 3 0 0021 12.75H3a3 3 0 002.886 2.268A3 3 0 005.25 21h13.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM9.75 12a.75.75 0 100 1.5.75.75 0 000-1.5zM14.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs text-app-muted font-medium leading-none mb-0.5">Your Personal</p>
          <p className="text-2xl font-extrabold text-app-text leading-tight">AI Coach</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-600">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col max-w-[84%] ${m.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
            {m.role === 'ai' && <p className="text-[10px] text-app-muted font-semibold mb-1 ml-1">AI Coach</p>}
            <div className={[
              'px-4 py-3 rounded-2xl text-sm leading-relaxed',
              m.role === 'ai'
                ? 'bg-app-card border border-app-border text-app-text rounded-tl-sm'
                : 'bg-accent text-app-text font-semibold rounded-tr-sm',
            ].join(' ')}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="self-start max-w-[84%]">
            <p className="text-[10px] text-app-muted font-semibold mb-1 ml-1">AI Coach</p>
            <div className="bg-app-card border border-app-border px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-app-muted animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-none border-t border-app-border bg-app-card px-4 py-3 flex gap-3 items-end">
        <textarea
          ref={textaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask your AI coach…"
          rows={1}
          className="flex-1 bg-app-bg border border-app-border rounded-2xl px-4 py-2.5 text-sm text-app-text placeholder-app-faint resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          style={{ maxHeight: 100 }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0 active:bg-accent-dark disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-app-text">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>

    </div>
  )
}
