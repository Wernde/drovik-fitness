/**
 * More — AI Coach chat screen.
 *
 * Features:
 * 1. Rich system prompt — active program, recent sessions, today's nutrition, weight
 * 2. Suggested question chips — shown before first user message
 * 3. Persistent history — last 20 messages stored in localStorage
 * 4. Streaming responses — words appear as they're generated
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, today } from '../db/db'
import { calcBMR, calcTDEE, calcMacros, loadProfile, DIET_PROGRAMS } from '../lib/tdee'
import { PremiumIconTile } from '../components/BrandIcon'

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAT_KEY   = 'drovik:ai-chat'
const MAX_STORED = 20

const SUGGESTED_QUESTIONS = [
  "What should I eat today?",
  "How's my program going?",
  "Tips for my next workout?",
  "How do I improve recovery?",
]

const GREETING = "Hey! Ready to crush today's workout? Ask me about form, nutrition, recovery, or programme adjustments."

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'ai'
  text: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function More() {

  // ── Persistent chat history ──────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Message[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch { /* ignore */ }
    return [{ role: 'ai', text: GREETING }]
  })

  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textaRef  = useRef<HTMLTextAreaElement>(null)

  const hasUserMessages = messages.some((m) => m.role === 'user')

  // Save to localStorage whenever messages change (cap at MAX_STORED)
  useEffect(() => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-MAX_STORED)))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── DB context queries ───────────────────────────────────────────────────────

  const latestWeight = useLiveQuery(async () => {
    const logs = await db.bodyWeightLogs.filter((l) => !l.deleted).toArray()
    logs.sort((a, b) => b.date.localeCompare(a.date))
    return logs[0]?.weight ?? null
  }, [])

  const programContext = useLiveQuery(async () => {
    const program = await db.programs.filter((p) => p.isActive && !p.deleted).first()
    if (!program) return null
    const days = await db.workoutDays
      .where('programId').equals(program.id)
      .filter((d) => !d.deleted)
      .toArray()
    days.sort((a, b) => a.order - b.order)
    const dayInfo = await Promise.all(days.map(async (d) => {
      const exs = await db.dayExercises
        .where('workoutDayId').equals(d.id)
        .filter((de) => !de.deleted)
        .toArray()
      return { name: d.name, exerciseCount: exs.length }
    }))
    return { programName: program.name, days: dayInfo }
  }, [])

  const recentSessions = useLiveQuery(async () => {
    const sessions = await db.workoutSessions
      .filter((s) => !s.deleted && !!s.finishedAt)
      .toArray()
    sessions.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
    return Promise.all(sessions.slice(0, 3).map(async (s) => {
      let dayName = 'Free Workout'
      if (s.workoutDayId) {
        const day = await db.workoutDays.get(s.workoutDayId)
        dayName = day?.name ?? dayName
      }
      const ses = await db.sessionExercises
        .where('workoutSessionId').equals(s.id)
        .filter((se) => !se.deleted)
        .toArray()
      const allSets = (await Promise.all(
        ses.map((se) => db.sets.where('sessionExerciseId').equals(se.id).filter((st) => !st.deleted && !st.isWarmup).toArray())
      )).flat()
      const volume   = allSets.reduce((acc, st) => acc + st.reps * st.weight, 0)
      const duration = s.finishedAt
        ? Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
        : null
      return { date: s.date, dayName, volume: Math.round(volume), duration, setCount: allSets.length }
    }))
  }, [])

  const weeklyCount = useLiveQuery(async () => {
    const now    = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const mondayStr = monday.toISOString().slice(0, 10)
    return db.workoutSessions.filter((s) => !s.deleted && !!s.finishedAt && s.date >= mondayStr).count()
  }, [])

  const todayNutrition = useLiveQuery(async () => {
    const todayStr = today()
    const logs = await db.foodLogs.where('date').equals(todayStr).filter((l) => !l.deleted).toArray()
    if (logs.length === 0) return null
    const foods = await db.foods.where('id').anyOf([...new Set(logs.map((l) => l.foodId))]).toArray()
    const foodMap = new Map(foods.map((f) => [f.id, f]))
    let cal = 0, pro = 0
    for (const log of logs) {
      const food = foodMap.get(log.foodId)
      if (!food) continue
      cal += food.caloriesPer100g * log.amountG / 100
      pro += food.proteinPer100g  * log.amountG / 100
    }
    return { calories: Math.round(cal), proteinG: Math.round(pro) }
  }, [])

  // ── Build system prompt from live context ────────────────────────────────────

  const sysPrompt = useMemo(() => {
    const parts: string[] = [
      'You are an AI fitness coach in the Drovik Fitness app.',
      'Goal: body recomposition. Keep responses to 3–4 sentences max — practical and motivating.',
    ]

    if (latestWeight != null) {
      parts.push(`Current weight: ${latestWeight}kg.`)
    }

    if (programContext) {
      const dayList = programContext.days
        .map((d) => `${d.name} (${d.exerciseCount} exercise${d.exerciseCount !== 1 ? 's' : ''})`)
        .join(', ')
      parts.push(`Active program: "${programContext.programName}" — days: ${dayList}.`)
    }

    if (weeklyCount != null) {
      parts.push(`This week: ${weeklyCount} session${weeklyCount !== 1 ? 's' : ''} completed.`)
    }

    if (recentSessions && recentSessions.length > 0) {
      const summaries = recentSessions.map((s) => {
        const vol = s.volume > 0
          ? `, ${s.volume >= 1000 ? (s.volume / 1000).toFixed(1) + 't' : s.volume + 'kg'} volume`
          : ''
        const dur = s.duration != null ? `, ${s.duration}min` : ''
        return `• ${s.date} — ${s.dayName} (${s.setCount} sets${vol}${dur})`
      })
      parts.push(`Recent sessions:\n${summaries.join('\n')}`)
    }

    if (todayNutrition) {
      parts.push(`Today's nutrition logged so far: ${todayNutrition.calories} kcal, ${todayNutrition.proteinG}g protein.`)
    }

    const profile = loadProfile()
    if (profile && latestWeight != null) {
      const bmr    = calcBMR(latestWeight, profile.heightCm, profile.age, profile.sex)
      const tdee   = calcTDEE(bmr, profile.activityLevel)
      const diet   = DIET_PROGRAMS.find((d) => d.id === profile.dietId)
      if (diet) {
        const macros = calcMacros(latestWeight, tdee, diet)
        parts.push(`Daily targets: ${macros.calories} kcal, ${macros.proteinG}g protein (${diet.name} diet plan).`)
      }
    }

    return parts.join('\n')
  }, [latestWeight, programContext, weeklyCount, recentSessions, todayNutrition])

  // ── Send with streaming ──────────────────────────────────────────────────────

  function getApiKey() {
    return localStorage.getItem('drovik:apiKey') ?? ''
  }

  async function send(userText?: string) {
    const msg = (userText ?? input).trim()
    if (!msg || loading) return

    const key = getApiKey()
    if (!key) {
      setMessages((m) => [...m, {
        role: 'ai',
        text: 'No API key set. Go to Settings → AI Coach to add your Anthropic API key.',
      }])
      setInput('')
      return
    }

    const next: Message[] = [...messages, { role: 'user', text: msg }]
    setMessages(next)
    setInput('')
    setLoading(true)

    const history = next.map((m) => ({
      role:    m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }))

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':                          'application/json',
          'x-api-key':                             key,
          'anthropic-version':                     '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 400,
          stream:     true,
          system:     sysPrompt,
          messages:   history,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      // Switch from typing dots → empty streaming bubble
      setLoading(false)
      setMessages((m) => [...m, { role: 'ai', text: '' }])

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              const chunk = parsed.delta.text as string
              setMessages((prev) => {
                const updated = [...prev]
                const last    = updated[updated.length - 1]
                if (last?.role === 'ai') {
                  updated[updated.length - 1] = { ...last, text: last.text + chunk }
                }
                return updated
              })
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }

    } catch {
      setLoading(false)
      setMessages((m) => [...m, { role: 'ai', text: 'Connection error. Check your API key and try again.' }])
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-app-bg lg:max-w-3xl lg:mx-auto lg:w-full">

      {/* ── Header ── */}
      <div className="bg-app-bg page-x pt-6 pb-3 flex items-center gap-3 border-b border-app-border flex-none">
        <PremiumIconTile name="ai" tone="blue" size="md" usage="card" active iconSize={34} />
        <div className="flex-1">
          <p className="text-xs text-app-muted font-medium leading-none mb-0.5">Your Personal</p>
          <p className="text-2xl font-extrabold text-app-text leading-tight">AI Coach</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold text-green-600">Live</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[84%] ${m.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}
          >
            {m.role === 'ai' && (
              <p className="text-[10px] text-app-muted font-semibold mb-1 ml-1">AI Coach</p>
            )}
            <div className={[
              'px-4 py-3 rounded-2xl text-sm leading-relaxed',
              m.role === 'ai'
                ? 'bg-app-card border border-app-border text-app-text rounded-tl-sm'
                : 'bg-accent text-app-text font-semibold rounded-tr-sm',
            ].join(' ')}>
              {m.text || (
                <span className="opacity-40 italic text-xs">…</span>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="self-start max-w-[84%]">
            <p className="text-[10px] text-app-muted font-semibold mb-1 ml-1">AI Coach</p>
            <div className="bg-app-card border border-app-border px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-app-muted animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Suggested question chips */}
        {!hasUserMessages && !loading && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => void send(q)}
                className="bg-app-card border border-app-border rounded-2xl px-3 py-2 text-xs font-semibold text-app-text active:bg-accent-light active:border-accent transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
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
          onClick={() => void send()}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0 active:bg-accent-dark disabled:opacity-40 transition-opacity"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-app-text">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>

    </div>
  )
}
