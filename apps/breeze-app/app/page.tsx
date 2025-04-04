"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

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
    try {
      setIsLoading(true)
      if (!MiniKit.isInstalled()) {
        setErrorMessage("Please install World App to continue")
        setShowErrorDialog(true)
        return
      }

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)
      if (finalPayload.status === 'error') {
        setErrorMessage("Verification failed. Please try again.")
        setShowErrorDialog(true)
        return
      }

      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
          action: 'matching',
        }),
      })

      const verifyResponseJson = await verifyResponse.json()
      if (verifyResponseJson.status === 200) {
        console.log('Verification success!')
        setIsVerified(true)
        setShowSuccessDialog(true)
      } else {
        setErrorMessage("Verification failed. Please try again.")
        setShowErrorDialog(true)
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.")
      setShowErrorDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <DialogTitle className="text-center">Verification Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Your identity has been verified. You can now start chatting with random people.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => {
              setShowSuccessDialog(false)
              handleStartChat()
            }}>
              Start Chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <DialogTitle className="text-center">Verification Failed</DialogTitle>
            <DialogDescription className="text-center">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => setShowErrorDialog(false)}>
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

