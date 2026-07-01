import { redirect } from 'next/navigation'
import { getSignInUrl } from '@workos-inc/authkit-nextjs'

/**
 * WorkOS AuthKit の sign-in endpoint。
 * WorkOS ダッシュボードで Sign-in endpoint に /sign-in を設定している。
 * 未認証ユーザーは AuthKit の proxy から自動でここへリダイレクトされる。
 */
export async function GET() {
  const signInUrl = await getSignInUrl()
  redirect(signInUrl)
}
