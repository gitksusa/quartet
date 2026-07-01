import { handleAuth } from '@workos-inc/authkit-nextjs'

/**
 * WorkOS AuthKit の callback endpoint。
 * WorkOS ダッシュボードの Redirect URI に /callback を設定している。
 * authorization code の受け取り → session cookie の発行までを SDK が処理する。
 */
export const GET = handleAuth()
