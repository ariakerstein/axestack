'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface TypewriterMarkdownProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
  instantRender?: boolean
}

/**
 * TypewriterMarkdown - Token-by-token streaming animation with markdown
 */
export function TypewriterMarkdown({
  text,
  speed = 300,
  onComplete,
  className = "",
  instantRender = false,
}: TypewriterMarkdownProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [tokens, setTokens] = useState<string[]>([])
  const onCompleteRef = useRef(onComplete)
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Split text into tokens
  useEffect(() => {
    hasCompletedRef.current = false

    if (!text) {
      setTokens([])
      setDisplayedText('')
      setCurrentIndex(0)
      return
    }

    const newTokens = text.match(/\S+|\s+/g) || [text]
    setTokens(newTokens)

    if (instantRender) {
      setDisplayedText(text)
      setCurrentIndex(newTokens.length)
      if (!hasCompletedRef.current && onCompleteRef.current) {
        hasCompletedRef.current = true
        setTimeout(() => onCompleteRef.current?.(), 0)
      }
    } else {
      setDisplayedText('')
      setCurrentIndex(0)
    }
  }, [text, instantRender])

  // Animate token-by-token
  useEffect(() => {
    if (instantRender) return

    if (currentIndex < tokens.length) {
      const currentToken = tokens[currentIndex]
      let delay = 10 + Math.random() * 15

      // Pauses after punctuation
      if (currentIndex > 0) {
        const prevToken = tokens[currentIndex - 1]
        if (/[.!?]$/.test(prevToken)) {
          delay += 50
        } else if (/[,;:]$/.test(prevToken)) {
          delay += 30
        } else if (/\n/.test(prevToken)) {
          delay += 40
        }
      }

      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + currentToken)
        setCurrentIndex(prev => prev + 1)
      }, delay)

      return () => clearTimeout(timer)
    } else if (!hasCompletedRef.current && currentIndex === tokens.length && tokens.length > 0) {
      hasCompletedRef.current = true
      onCompleteRef.current?.()
    }
  }, [currentIndex, tokens, instantRender])

  return (
    <div className={`relative ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-gray-800">
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-2 text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium mb-2 text-gray-900">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-gray-800">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-800">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-800">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-700">{children}</em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:text-amber-700 underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-amber-400 pl-4 italic text-gray-600 mb-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {!instantRender && currentIndex < tokens.length && tokens.length > 0 && (
        <span className="inline-block ml-1 animate-pulse font-bold text-amber-500">|</span>
      )}
    </div>
  )
}
