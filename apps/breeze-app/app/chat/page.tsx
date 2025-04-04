"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Send, Clock } from "lucide-react"

type Message = {
  id: string
  content: string
  sender: "user" | "partner"
  timestamp: Date
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi there! What would you like to talk about?",
      sender: "partner",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      router.push("/chat-ended")
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, router])

  // Simulate partner typing
  useEffect(() => {
    const partnerResponses = [
      "That's interesting! Tell me more.",
      "I've been thinking about that too recently.",
      "What do you think about that topic?",
      "I've never thought about it that way before.",
      "That reminds me of something I read recently.",
    ]

    const lastMessage = messages[messages.length - 1]

    if (lastMessage && lastMessage.sender === "user") {
      const timeout = setTimeout(
        () => {
          const randomResponse = partnerResponses[Math.floor(Math.random() * partnerResponses.length)]
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              content: randomResponse,
              sender: "partner",
              timestamp: new Date(),
            },
          ])
        },
        Math.random() * 2000 + 1000,
      )

      return () => clearTimeout(timeout)
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) return

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: inputValue,
        sender: "user",
        timestamp: new Date(),
      },
    ])

    setInputValue("")
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200">
      <CardHeader className="flex flex-row items-center justify-between bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-sm font-medium">Anonymous Partner</span>
        </div>
        <div className="flex items-center space-x-2 rounded-full bg-slate-100 px-3 py-1">
          <Clock className="h-4 w-4 text-slate-500" />
          <span className={`text-sm font-medium ${timeLeft < 60 ? "text-red-500" : ""}`}>{formatTime(timeLeft)}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-900"
                }`}
              >
                <p>{message.content}</p>
                <p className="mt-1 text-right text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </div>
  )
}

