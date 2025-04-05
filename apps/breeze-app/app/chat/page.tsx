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
  const [shouldLeave, setShouldLeave] = useState(false)
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
      if (!quietLeave) {
        router.push("/chat-ended")
      }
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
          content: "Partner request was rejected",
          sender: "system",
          timestamp: new Date(),
        },
      ])
    })

    return () => {
      socketClient.disconnect()
    }
  }, [roomId, router])

  // 监听 quietLeave 变化
  useEffect(() => {
    if (shouldLeave) {
      handleLeaveRoom()
      setShouldLeave(false)
    }
  }, [quietLeave, shouldLeave])

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
      setShouldLeave(true)
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
    setQuietLeave(true)
    setShouldLeave(true)
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-breeze-mint to-breeze-cyan">
        <div className="flex flex-col items-center space-y-4 p-8 rounded-2xl bg-white/90 backdrop-blur-sm border border-breeze-aqua">
          <Loader2 className="h-8 w-8 animate-spin text-breeze-dark-turquoise" />
          <p className="text-base text-breeze-dark-cyan">
            {isLeaving ? "Leaving chat room..." : "Waiting for response..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-breeze-mint to-breeze-cyan">
      <header className="fixed top-0 left-0 right-0 h-16 z-50 flex flex-row items-center justify-between bg-white/90 backdrop-blur-sm p-4 border-b border-breeze-aqua">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-breeze-mint animate-pulse"></div>
          {partnerName ? (
            <div className="flex items-center space-x-2">
              <span
                className="text-base font-medium cursor-pointer text-breeze-dark-turquoise hover:text-breeze-dark-cyan transition-colors"
                onClick={handleCopyName}
              >
                {partnerName}
              </span>
            </div>
          ) : (
            <span className="text-base font-medium text-breeze-dark-turquoise">Anonymous Partner</span>
          )}
        </div>
        {!partnerName && (
          <div className="flex items-center space-x-2 rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 border border-breeze-aqua">
            <Clock className="h-4 w-4 text-breeze-dark-turquoise" />
            <span className={`text-base font-medium ${timeLeft < 60 ? "text-red-500" : "text-breeze-dark-turquoise"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </header>

      {/* Copy success toast */}
      {showCopyToast && (
        <div className="fixed top-20 right-4 flex items-center space-x-2 rounded-lg bg-gradient-to-r from-breeze-mint to-breeze-cyan px-4 py-2 text-sm text-white shadow-lg z-50">
          <Check className="h-4 w-4" />
          <span>WorldID copied!</span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-16">
        <div className="space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "system" ? "justify-center" : message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.sender === "system" ? (
                <div className="rounded-lg bg-white/60 px-4 py-2 text-sm text-gray-600/80 max-w-[85%] text-center border border-gray-200/50 whitespace-pre-wrap break-words shadow-sm">
                  {message.content}
                </div>
              ) : (
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${message.sender === "user"
                    ? "bg-breeze-dark-turquoise text-white"
                    : "bg-white/90 backdrop-blur-sm text-breeze-dark-turquoise"
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
              <div className="rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 text-sm text-breeze-dark-cyan">
                <p className="italic">Typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-breeze-aqua bg-white/90 backdrop-blur-sm p-4">
        <form onSubmit={handleSendMessage} className="flex w-full space-x-2 pb-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-breeze-aqua text-breeze-dark-turquoise hover:bg-breeze-mint/10"
            onClick={() => setIsLeaveDialogOpen(true)}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Leave Room</span>
          </Button>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 border-breeze-aqua focus:ring-breeze-mint"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim()}
            className="bg-breeze-aqua hover:bg-breeze-turquoise text-white transition-colors"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </footer>

      {/* Friend Request Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-white/90 backdrop-blur-sm border-breeze-aqua w-[90%] max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Time's Up!</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan">
              Would you like to add this person as a friend to continue chatting?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleAcceptFriend}
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
            >
              Yes, Add Friend
            </Button>
            <Button
              variant="outline"
              onClick={handleRejectFriend}
              className="border-breeze-aqua text-breeze-dark-turquoise hover:bg-breeze-mint/10"
            >
              No, Thanks
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Input Dialog */}
      <Dialog open={showNameInputDialog} onOpenChange={setShowNameInputDialog}>
        <DialogContent className="bg-white/90 backdrop-blur-sm border-breeze-aqua w-[90%] max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Enter Your Name</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan">
              Please enter your name to share with your new friend
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="border-breeze-aqua focus:ring-breeze-mint"
            />
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleSubmitName}
                disabled={!nameInput.trim()}
                className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
              >
                Submit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNameInputDialog(false)
                  handleLeaveRoom()
                }}
                className="border-breeze-aqua text-breeze-dark-turquoise hover:bg-breeze-mint/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-white/90 backdrop-blur-sm border-breeze-aqua w-[90%] max-w-[90%] rounded-2xl">
          <DialogHeader>
            <div className="flex justify-center">
              <Check className="h-12 w-12 text-breeze-mint" />
            </div>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Match Success!</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan whitespace-pre-line">
              You and {partnerName} are now friends!{'\n'}Let the good chats continue!
            </DialogDescription>

          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={handleCloseSuccessDialog}
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
            >
              Continue Chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white/90 backdrop-blur-sm border-breeze-aqua w-[90%] max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Not This Time, But Keep Going!</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan">
              Don't worry – more friends await!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              onClick={handleCloseRejectDialog}
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
            >
              Return to Home
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="bg-white/90 backdrop-blur-sm border-breeze-aqua w-[90%] max-w-[90%] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Leave Chat?</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan whitespace-pre-line">
              Are you sure you want to leave this chat?{'\n'}This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
              className="border-breeze-aqua text-breeze-dark-turquoise hover:bg-breeze-mint/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeaveRoom}
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
              disabled={isLeaving}
            >
              {isLeaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

