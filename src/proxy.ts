import { authkitProxy } from '@workos-inc/authkit-nextjs'

/**
 * Next.js 16 の proxy（旧 middleware）。
 * WorkOS AuthKit のセッション更新と認証ガードを担う。
 *
 * matcher 対象パス（middleware が走る = withAuth 動作可能）:
 *   - '/': ルート page.tsx で withAuth() を呼んで認証済み判定するため必要。
 *          unauthenticatedPaths に含めて未認証でも入口 UI を表示できるようにする
 *          （sign-in 強制回避）。
 *   - '/admin/:path*': 認証必須の管理画面配下。
 *
 * matcher 対象外パス（middleware が走らない・上記以外の全て）:
 *   /[slug]/recruit、/sign-in、/callback、/sitemap.xml、/robots.txt など。
 *   これらは既存挙動を維持する（proxy 影響なし）。
 *
 * middlewareAuth.enabled = true で matcher に一致した path のうち
 * unauthenticatedPaths にマッチしない全パス（= /admin 配下）への未認証アクセスを
 * sign-in へ redirect する。/ は unauthenticatedPaths に含まれるため未認証でも
 * アクセス可能。
 */
export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/'],
  },
})

export const config = {
  matcher: ['/', '/admin/:path*'],
}
