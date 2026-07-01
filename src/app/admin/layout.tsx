import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";

/**
 * 管理画面 (/admin 配下) 共通レイアウト。
 *
 * AuthKitProvider を admin 配下に限定して配置する理由:
 *   - Provider は初回マウント時に getAuthAction() Server Action を呼び、
 *     visibilitychange / focus のたびに checkSessionAction() を呼ぶ。
 *   - root layout に置くと /enu/recruit 等の公開ページでも
 *     これらの Server Action リクエストが走り、Vercel Function 呼び出しが増える。
 *   - 認証が必要な /admin 配下のみを Provider の適用範囲とすることで、
 *     公開ページに一切の副作用を持ち込まないようにする。
 *
 * 認証ガード自体は src/proxy.ts（matcher: /admin/:path*）が担当するため、
 * このレイアウトが未認証状態で描画されることはない。
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthKitProvider>{children}</AuthKitProvider>;
}
