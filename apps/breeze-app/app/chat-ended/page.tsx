"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"

export default function ChatEndedPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-breeze-mint to-breeze-cyan p-4">
      <div className="flex flex-col items-center space-y-6 rounded-2xl bg-white/90 backdrop-blur-sm p-8 text-center border border-breeze-aqua">
        <h1 className="text-2xl font-semibold text-breeze-dark-turquoise">Chat Ended</h1>
        <p className="text-breeze-dark-cyan whitespace-pre-line">
          Ready to meet someone new? {'\n'}Start another exciting conversation!
        </p>
        <div className="flex flex-col space-y-3 w-full">
          <Button
            onClick={() => router.push("/matching")}
            className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Start New Chat
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="border-breeze-aqua text-breeze-dark-turquoise hover:bg-breeze-mint/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  )
}

