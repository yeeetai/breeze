"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const handleStartChat = () => {
    setIsLoading(true)
    // In a real app, we would connect to a backend service here
    setTimeout(() => {
      router.push("/matching")
    }, 1000)
  }

  const verifyPayload: VerifyCommandInput = {
    action: 'matching', // This is your action ID from the Developer Portal
    verification_level: VerificationLevel.Device, // Orb | Device
  }

  const handleVerify = async () => {
    if (!MiniKit.isInstalled()) {
      return
    }
    // World App will open a drawer prompting the user to confirm the operation, promise is resolved once user confirms or cancels
    const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
    if (finalPayload.status === 'error') {
      return console.log('Error payload', finalPayload)
    }

    // Verify the proof in the backend
    const verifyResponse = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payload: finalPayload as ISuccessResult, // Parses only the fields we need to verify
        action: 'matching',
      }),
    })

    // TODO: Handle Success!
    const verifyResponseJson = await verifyResponse.json()
    if (verifyResponseJson.status === 200) {
      console.log('Verification success!')
      setIsVerified(true)
    } else {
      console.error('Verification failed:', verifyResponseJson.status)
    }
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
          <Button className="w-full" size="lg" onClick={(e) => {
            e.preventDefault()
            if (!isVerified) {
              handleVerify()
              return
            }
            handleStartChat()
          }} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isVerified ? "Connecting..." : "Verifying..."}
              </>
            ) : (
              isVerified ? "Start Chatting" : "Verify"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

