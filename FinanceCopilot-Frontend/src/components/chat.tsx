'use client'
import { useState, useRef, useEffect } from 'react'
import apiClient from '@/lib/api-client'
import { Send, Bot, User, Loader2, X, MessageCircle } from 'lucide-react'

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

const CURRENT_SESSION_KEY = 'current_chat_session_id'

export function Chat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m FinanceCopilot. Ask me anything about stocks, investing, or finance!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingSession, setLoadingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Load current session when chat opens
  useEffect(() => {
    if (isOpen) {
      loadCurrentSession()
    } else {
      // Reset to welcome message when closed
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m FinanceCopilot. Ask me anything about stocks, investing, or finance!'
        }
      ])
    }
  }, [isOpen])

  const loadCurrentSession = async () => {
    setLoadingSession(true)
    try {
      const res = await apiClient.get('/chatbot/session/current')
      const sessionId = res.data.session.id
      setSessionId(sessionId)
      const sessionMessages = res.data.messages || []
      if (sessionMessages.length > 0) {
        setMessages(sessionMessages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })))
      } else {
        // Show welcome message if no messages
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! I\'m FinanceCopilot. Ask me anything about stocks, investing, or finance!'
          }
        ])
      }
      // Store in localStorage for syncing with chat page
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
    } catch (error) {
      console.error('Error loading current session:', error)
      setSessionId(null)
      localStorage.removeItem(CURRENT_SESSION_KEY)
    } finally {
      setLoadingSession(false)
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
      const res = await apiClient.post('/chatbot/chat', {
        message: currentInput,
        session_id: sessionId,  // Use existing session or null to create new one
        context: {}
      })

      // Update session_id if this was a new session
      if (res.data.session_id && !sessionId) {
        const newSessionId = res.data.session_id
        setSessionId(newSessionId)
        localStorage.setItem(CURRENT_SESSION_KEY, newSessionId)
      }

      // Check if response contains an error message
      const responseContent = res.data.content || ''
      if (responseContent.toLowerCase().includes('error') || 
          responseContent.toLowerCase().includes('quota') ||
          responseContent.toLowerCase().includes('exceeded') ||
          responseContent.toLowerCase().includes('429')) {
        // This is an error response, show it to the user
        const errorMessage: Message = {
          role: 'assistant',
          content: responseContent,
          timestamp: res.data.timestamp
        }
        setMessages(prev => [...prev, errorMessage])
      } else {
        // Normal response
        const assistantMessage: Message = {
          role: 'assistant',
          content: responseContent,
          timestamp: res.data.timestamp
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorDetail = error.response?.data?.detail || error.response?.data?.content || error.message || 'Unknown error'
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
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-white bg-gray-900 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need help?
          </span>
        </button>
      )}

      {/* Chat Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setIsOpen(false)}
        />

        {/* Chat Panel */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-full sm:w-96 md:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 flex flex-col ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800">AI Assistant</h2>
                <p className="text-xs lg:text-sm text-gray-500">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            {loadingSession ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="animate-spin text-emerald-500" />
              </div>
            ) : (
              messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                  }`}
                >
                  <p className="text-sm lg:text-base leading-relaxed">{stripMarkdown(message.content)}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            )))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about stocks, investing, finance..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm lg:text-base"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-emerald-500/30"
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
    </>
  )
}
