'use client'
import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, Bot, User, Loader2, Sparkles, Plus } from 'lucide-react'
import { API_BASE } from '@/lib/api-config'

// Strip markdown formatting from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Italic *text*
    .replace(/__(.*?)__/g, '$1') // Bold __text__
    .replace(/_(.*?)_/g, '$1') // Italic _text_
    .replace(/`(.*?)`/g, '$1') // Inline code `code`
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/#{1,6}\s*(.*)/g, '$1') // Headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links [text](url)
    .replace(/^\s*[-*+]\s+/gm, '') // Bullet points
    .replace(/^\s*\d+\.\s+/gm, '') // Numbered lists
    .trim()
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface ChatSession {
  id: string
  title?: string
  created_at: string
  updated_at: string
  message_count: number
}

export function ChatFull() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loadingSession, setLoadingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Load session messages if sessionId exists
  useEffect(() => {
    if (sessionId) {
      loadSessionMessages(sessionId)
    }
  }, [sessionId])

  const loadSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/chatbot/sessions`)
      setSessions(res.data)
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const loadSessionMessages = async (sid: string) => {
    setLoadingSession(true)
    try {
      const res = await axios.get(`${API_BASE}/chatbot/sessions/${sid}`)
      setMessages(res.data.messages || [])
    } catch (error) {
      console.error('Error loading session messages:', error)
    } finally {
      setLoadingSession(false)
    }
  }

  const createNewSession = async () => {
    try {
      const res = await axios.post(`${API_BASE}/chatbot/sessions`)
      setSessionId(res.data.id)
      setMessages([])
      await loadSessions()
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input
    }

    setMessages([...messages, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post(`${API_BASE}/chatbot/chat`, {
        message: currentInput,
        session_id: sessionId,
        context: {}
      })

      // Update session_id if this was a new session
      if (res.data.session_id && !sessionId) {
        setSessionId(res.data.session_id)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: res.data.content,
        timestamp: res.data.timestamp
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Refresh sessions list
      await loadSessions()
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorDetail = error.response?.data?.detail || error.message || 'Unknown error'
      console.error('Error details:', errorDetail)
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorDetail}. Please try again.`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Minimal Header - Status Indicator */}
      <div className="border-b border-gray-200 px-6 py-2 bg-gray-50/50 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={createNewSession}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus size={16} className="text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">AI Assistant Ready</span>
            </div>
          </div>
          {messages.length > 0 && (
            <span className="text-xs text-gray-500">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {loadingSession ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-emerald-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center min-h-0">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome to FinanceCopilot</h2>
                  <p className="text-sm text-gray-600">Ask me anything about stocks, investing, or finance</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <Bot size={18} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {stripMarkdown(message.content)}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="border-t border-gray-200 px-6 pt-6 pb-8 bg-white flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask about stocks, investing, finance..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-[15px] placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}