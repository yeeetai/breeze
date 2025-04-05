"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Send, Clock, LogOut, Loader2, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { socketClient } from "@/lib/socket-client"
import { MiniKit } from '@worldcoin/minikit-js'

type Message = {
  id: string
  content: string
  sender: "user" | "partner" | "system"
  timestamp: Date
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId")
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showNameInputDialog, setShowNameInputDialog] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [isWaitingResponse, setIsWaitingResponse] = useState(false)
  const [quietLeave, setQuietLeave] = useState(false)
  const [partnerName, setPartnerName] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [isPartnerTyping, setIsPartnerTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      setShowInviteDialog(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Socket connection and message handling
  useEffect(() => {
    if (!roomId) {
      router.push("/")
      return
    }

    // Connect to socket
    socketClient.connect()

    // Join the room
    socketClient.joinRoom(roomId)

    // Listen for messages
    socketClient.onReceiveMessage((data) => {
      console.log("Received message:", data)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: data.message,
          sender: data.sender === "system" ? "system" : "partner",
          timestamp: new Date(),
        },
      ])
    })

    // Listen for typing status
    socketClient.onPartnerTyping(() => {
      setIsPartnerTyping(true)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsPartnerTyping(false)
      }, 3000)
    })

    // Listen for partner leaving
    socketClient.onPartnerLeft(() => {
      router.push("/chat-ended")
    })

    // Listen for friend request accepted
    socketClient.onFriendRequestAccepted((data) => {
      setPartnerName(data.name)
      setShowSuccessDialog(true)
      setIsWaitingResponse(false)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: `${data.name} has accepted your friend request!`,
          sender: "system",
          timestamp: new Date(),
        },
      ])
    })

    // Listen for friend request rejected
    socketClient.onFriendRequestRejected(() => {
      setShowRejectDialog(true)
      setIsWaitingResponse(false)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: "Friend request was rejected",
          sender: "system",
          timestamp: new Date(),
        },
      ])
    })

    return () => {
      socketClient.disconnect()
    }
  }, [roomId, router])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim() || !roomId) return

    // Send message through socket
    socketClient.sendMessage(roomId, inputValue)

    // Add message to local state
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (roomId) {
      socketClient.sendTypingStatus(roomId)
    }
  }

  const handleLeaveRoom = async () => {
    if (roomId) {
      setIsLeaving(true)
      setIsLeaveDialogOpen(false)

      try {
        // if not connected, try to connect
        if (!socketClient.isConnected()) {
          socketClient.connect()
          // wait for connection
          const maxAttempts = 10
          let attempts = 0
          while (!socketClient.isConnected() && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100))
            attempts++
          }
        }

        // check if socket is connected
        if (socketClient.isConnected()) {
          // wait for message to be sent
          await new Promise(resolve => setTimeout(resolve, 100))
          // leave room
          if (quietLeave) {
            socketClient.quietLeaveRoom(roomId)
          } else {
            socketClient.leaveRoom(roomId)
          }
          // wait for leave room request to be sent
          await new Promise(resolve => setTimeout(resolve, 100))
          // disconnect
          socketClient.disconnect()
        }
      } catch (error) {
        console.error("Error leaving room:", error)
      } finally {
        // navigate to chat ended page
        router.push("/chat-ended")
      }
    }
  }

  const handleAcceptFriend = () => {
    setShowInviteDialog(false)
    if (!roomId) return

    if (MiniKit.isInstalled()) {
      // Use stored MiniKit username
      const username = MiniKit.user?.username || localStorage.getItem('minikit_username') || "";
      if (username) {
        socketClient.acceptFriendRequest(roomId, username)
        setIsWaitingResponse(true)
      } else {
        setShowNameInputDialog(true)
      }
    } else {
      // Show name input dialog if MiniKit is not installed
      setShowNameInputDialog(true)
    }
  }

  const handleRejectFriend = () => {
    if (roomId) {
      setQuietLeave(true)
      socketClient.rejectFriendRequest(roomId)
      handleLeaveRoom()
    }
  }

  const handleSubmitName = () => {
    if (nameInput.trim() && roomId) {
      socketClient.acceptFriendRequest(roomId, nameInput.trim())
      setShowNameInputDialog(false)
      setNameInput("")
      setIsWaitingResponse(true)
    }
  }

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false)
  }

  const handleCloseRejectDialog = () => {
    setShowRejectDialog(false)
    handleLeaveRoom()
  }

  const handleCopyName = () => {
    if (partnerName) {
      navigator.clipboard.writeText(partnerName)
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 2000)
    }
  }

  if (isLeaving || isWaitingResponse) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isLeaving ? "Leaving chat room..." : "Waiting for partner's response..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-100 to-slate-200">
      <CardHeader className="flex flex-row items-center justify-between bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          {partnerName ? (
            <div className="flex items-center space-x-2">
              <span
                className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                onClick={handleCopyName}
              >
                {partnerName}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium">Anonymous Partner</span>
          )}
        </div>
        {!partnerName && (
          <div className="flex items-center space-x-2 rounded-full bg-slate-100 px-3 py-1">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className={`text-sm font-medium ${timeLeft < 60 ? "text-red-500" : ""}`}>{formatTime(timeLeft)}</span>
          </div>
        )}
      </CardHeader>

      {/* Copy success toast */}
      {showCopyToast && (
        <div className="fixed top-4 right-4 flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          <Check className="h-4 w-4" />
          <span>Name copied to clipboard!</span>
        </div>
      )}

      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              {message.sender === "system" ? (
                <div className="mx-auto rounded-full bg-slate-200 px-4 py-1 text-sm text-slate-500">
                  {message.content}
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-slate-200 text-slate-900"
                    }`}
                >
                  <p>{message.content}</p>
                  <p className="mt-1 text-right text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
            </div>
          ))}
          {isPartnerTyping && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-slate-200 px-4 py-2 text-slate-900">
                <p className="text-sm italic">Typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      <CardFooter className="border-t bg-white p-4 pb-8">
        <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setIsLeaveDialogOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Leave Room</span>
          </Button>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>

      {/* Friend request dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Time's Up!</DialogTitle>
            <DialogDescription className="text-center">
              Would you like to add this person as a friend to continue chatting?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button onClick={handleAcceptFriend}>
              Yes, add friend
            </Button>
            <Button variant="outline" onClick={handleRejectFriend}>
              No, thanks
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name input dialog */}
      <Dialog open={showNameInputDialog} onOpenChange={setShowNameInputDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Enter Your Name</DialogTitle>
            <DialogDescription className="text-center">
              Please enter your name to share with your new friend
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full"
            />
            <div className="flex flex-col space-y-2">
              <Button onClick={handleSubmitName} disabled={!nameInput.trim()}>
                Submit
              </Button>
              <Button variant="outline" onClick={() => {
                setShowNameInputDialog(false)
                handleLeaveRoom()
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Success! <span className="text-4xl">🎉</span></DialogTitle>
            <DialogDescription className="text-center">
              You and {partnerName} are now friends! You can continue chatting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button onClick={handleCloseSuccessDialog}>
              Continue Chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Request Rejected <span className="text-4xl">😐</span></DialogTitle>
            <DialogDescription className="text-center">
              Your friend request was rejected. The chat will end now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button onClick={handleCloseRejectDialog}>
              Return to Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave room dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Leave Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleLeaveRoom}>
              Leave Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

