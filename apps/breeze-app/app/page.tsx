"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartChat = () => {
    setIsLoading(true)
    // In a real app, we would connect to a backend service here
    setTimeout(() => {
      router.push("/matching")
    }, 1000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Anonymous Chat</CardTitle>
          <CardDescription>Connect with random people for 5-minute anonymous conversations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-6">
          <div className="rounded-full bg-primary/10 p-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-medium">How it works</h3>
            <ul className="text-sm text-muted-foreground">
              <li>• You'll be matched with a random person</li>
              <li>• Chat anonymously for 5 minutes</li>
              <li>• When time's up, the chat ends</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg" onClick={handleStartChat} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Start Chatting"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

