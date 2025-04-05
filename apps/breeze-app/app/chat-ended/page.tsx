"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChatEndedPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Chat Ended</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-6 text-center">
          <div className="rounded-full bg-primary/10 p-6">
            <span className="text-6xl">👋</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Would you like to start a new conversation with someone else?
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" size="lg" onClick={() => router.push("/matching")}>
            Start New Chat
          </Button>
          <Button className="w-full" variant="outline" size="lg" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

