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
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleStartChat = () => {
    setIsLoading(true)
    setTimeout(() => {
      router.push("/matching")
    }, 1000)
  }

  const verifyPayload: VerifyCommandInput = {
    action: 'matching',
    verification_level: VerificationLevel.Device,
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
        setIsWalletConnected(true)
        const username = MiniKit.user?.username;
        const walletAddress = MiniKit.user?.walletAddress;

        if (username) {
          localStorage.setItem('minikit_username', username);
        }
        if (walletAddress) {
          localStorage.setItem('minikit_wallet_address', walletAddress);
        }
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-breeze-mint to-breeze-cyan p-4">
        <Card className="w-full max-w-md border-breeze-aqua bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-breeze-dark-turquoise">Breeze</CardTitle>
            <CardDescription className="text-lg mt-2 font-medium text-breeze-dark-cyan">Light as Air, Real as You</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 p-6">
            <div className="rounded-full bg-gradient-to-b from-breeze-mint to-breeze-cyan p-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-md"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="space-y-4 text-center">
              <ul className="text-base space-y-3 text-breeze-dark-cyan">
                <li className="flex items-center justify-center space-x-2">
                  <span className="text-breeze-aqua">•</span>
                  <span>Meet someone real, at random</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <span className="text-breeze-aqua">•</span>
                  <span>Chat freely for 5 minutes</span>
                </li>
                <li className="flex items-center justify-center space-x-2">
                  <span className="text-breeze-aqua">•</span>
                  <span>When time's up, a new friend awaits</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {!isWalletConnected ? (
              <Button
                className="w-full bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white shadow-md"
                size="lg"
                onClick={signInWithWallet}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </Button>
            ) : !isVerified ? (
              <Button
                className="w-full bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white shadow-md"
                size="lg"
                onClick={handleVerify}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify WorldID"
                )}
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white shadow-md"
                size="lg"
                onClick={handleStartChat}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Start Chatting"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg border-breeze-aqua bg-white/90 backdrop-blur-sm">
          <DialogHeader>
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-breeze-mint" />
            </div>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Verification Successful!</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan">
              Your identity has been verified. You can now start chatting with random people.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white shadow-md"
              onClick={() => {
                setShowSuccessDialog(false)
                handleStartChat()
              }}
            >
              Start Chatting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="w-[90%] max-w-[320px] rounded-lg border-breeze-aqua bg-white/90 backdrop-blur-sm">
          <DialogHeader>
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <DialogTitle className="text-center text-breeze-dark-turquoise">Verification Failed</DialogTitle>
            <DialogDescription className="text-center text-breeze-dark-cyan">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button
              className="bg-gradient-to-r from-breeze-mint to-breeze-cyan hover:opacity-90 text-white shadow-md"
              onClick={() => setShowErrorDialog(false)}
            >
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

