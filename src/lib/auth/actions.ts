'use server'

import 'server-only'

import { signOut } from '@workos-inc/authkit-nextjs'

/**
 * ログアウト Server Action。
 * 管理画面のログアウトボタン（PR3 以降で追加）から呼び出す。
 * WorkOS AuthKit の signOut() はセッションクッキーを破棄し、
 * returnTo（デフォルトはサインインページ）へリダイレクトする。
 */
export async function signOutAction() {
  await signOut()
}
