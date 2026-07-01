import 'server-only'

import { withAuth } from '@workos-inc/authkit-nextjs'

/**
 * 現在のセッションを返す（未ログインなら user = null）。
 * public ページ・条件分岐用。
 */
export function getCurrentWorkosUser() {
  return withAuth()
}

/**
 * ログイン必須のサーバー処理から呼ぶ。
 * 未ログインの場合は authkit の sign-in URL へリダイレクトされる。
 */
export function requireAuth() {
  return withAuth({ ensureSignedIn: true })
}
