import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic' // 禁用路由缓存

export async function GET(req: NextRequest) {
    // Expects only alphanumeric characters
    const nonce = crypto.randomUUID().replace(/-/g, "")

    // The nonce should be stored somewhere that is not tamperable by the client
    const response = NextResponse.json({ nonce })
    response.cookies.set("siwe", nonce, {
        secure: process.env.NODE_ENV === 'production',  // 开发环境不需要 secure
        httpOnly: true,
        sameSite: 'lax',
        path: '/'
    })

    return response
} 