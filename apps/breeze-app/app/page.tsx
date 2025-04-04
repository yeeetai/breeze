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

  const signInWithWallet = async () => {
    try {
      setIsLoading(true)
      if (!MiniKit.isInstalled()) {
        setErrorMessage("Please install World App to continue")
        setShowErrorDialog(true)
        return
      }

      const res = await fetch('/api/nonce', {
        cache: 'no-store'
      })
      if (!res.ok) {
        throw new Error(`Get nonce failed: ${res.status} ${res.statusText}`)
      }
      const { nonce } = await res.json()

      console.log("Using walletAuth...")
      const { commandPayload: generateMessageResult, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
      })

      if (finalPayload.status === 'error') {
        setErrorMessage("Wallet authentication failed")
        setShowErrorDialog(true)
        return
      }

      const siweResponse = await fetch('/api/complete-siwe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      })

      if (!siweResponse.ok) {
        throw new Error(`SIWE verification failed: ${siweResponse.status} ${siweResponse.statusText}`)
      }

      const siweResult = await siweResponse.json()
      console.log("SIWE result:", siweResult)

      if (siweResult.isValid) {
        setIsVerified(true)
        setShowSuccessDialog(true)
      } else {
        setErrorMessage(siweResult.message || "Verification failed")
        setShowErrorDialog(true)
      }
    } catch (error) {
      console.error("Error:", error)
      setErrorMessage(error instanceof Error ? error.message : "An error occurred. Please try again.")
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
                signInWithWallet()
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

