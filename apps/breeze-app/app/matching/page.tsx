"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { socketClient } from "@/lib/socket-client"

export default function MatchingPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [searchTime, setSearchTime] = useState(0)

  useEffect(() => {
    // socket connect
    socketClient.connect()

    // Listen for match success event
    socketClient.onMatchSuccess((data) => {
      clearInterval(progressInterval)
      clearInterval(timeInterval)
      // Pass roomId to chat page
      router.push(`/chat?roomId=${data.roomId}`)
    })

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 1
      })
    }, 50)

    const timeInterval = setInterval(() => {
      setSearchTime((prev) => prev + 1)
    }, 1000)

    // Send find match request
    socketClient.findMatch()

    return () => {
      clearInterval(progressInterval)
      clearInterval(timeInterval)
      socketClient.disconnect()
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-breeze-mint to-breeze-cyan p-4">
      <Card className="w-full max-w-md border-breeze-aqua bg-white/90 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-6 p-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-breeze-mint/30 animate-ping" />
              </div>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-breeze-mint to-breeze-cyan">
                <div className="h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-medium text-breeze-dark-turquoise">Finding a chat partner...</h3>
              <p className="text-base text-breeze-dark-cyan">Searching for {searchTime} seconds</p>
            </div>

            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2 w-full bg-breeze-mint/20" />
              <p className="text-sm text-breeze-dark-cyan">Matching you with someone to chat with</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

