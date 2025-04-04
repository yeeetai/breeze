import { NextRequest, NextResponse } from 'next/server'
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js'

export const dynamic = 'force-dynamic' // 禁用路由缓存

interface IRequestPayload {
    payload: MiniAppWalletAuthSuccessPayload
    nonce: string
}

export async function POST(req: NextRequest) {
    const { payload, nonce } = (await req.json()) as IRequestPayload
    const storedNonce = req.cookies.get('siwe')?.value

    if (nonce !== storedNonce) {
        return NextResponse.json({
            status: 'error',
            isValid: false,
            message: 'Invalid nonce',
        })
    }

    try {
        const validMessage = await verifySiweMessage(payload, nonce)
        return NextResponse.json({
            status: 'success',
            isValid: validMessage.isValid,
            walletAddress: validMessage.siweMessageData?.address,
        })
    } catch (error: any) {
        console.error('SIWE verification error:', error)
        return NextResponse.json({
            status: 'error',
            isValid: false,
            message: error.message || 'Verification failed',
        })
    }
} 