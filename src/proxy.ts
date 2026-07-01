import { authkitProxy } from '@workos-inc/authkit-nextjs'

/**
 * Next.js 16 の proxy（旧 middleware）。
 * WorkOS AuthKit のセッション更新と /admin 配下の認証ガードを担う。
 *
 * matcher で /admin 配下のみをこの proxy の対象にする。
 * /[slug]/recruit、/sitemap.xml、/robots.txt、/sign-in、/callback、/sign-out は
 * matcher に含めないことで一切影響しない。
 *
 * middlewareAuth.enabled = true で、matcher に一致した全パスへの
 * 未認証アクセスを sign-in へリダイレクトする。
 */
export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [],
  },
})

export const config = {
  matcher: ['/admin/:path*'],
}
