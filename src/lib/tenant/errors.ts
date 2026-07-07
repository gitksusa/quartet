import 'server-only'

/**
 * WorkOS ユーザーに紐づく tenant_users レコードが存在しないことを示すエラー。
 * docs/design/auth-tenant-access-control.md §5「Phase 0b の tenant 所属解決方針」に従い、
 * 0件のケースは黙って続行せず必ずこのエラーを throw する。
 */
export class TenantNotFoundError extends Error {
  readonly workosUserId: string

  constructor(workosUserId: string) {
    super('No active tenant found for the current WorkOS user.')
    this.name = 'TenantNotFoundError'
    this.workosUserId = workosUserId
  }
}

/**
 * URL の tenantSlug が、認証済みユーザーの所属テナントの slug と一致しないことを示すエラー。
 * PR3 の /admin/[tenantSlug]/layout.tsx では notFound() へ変換する
 * （情報漏洩を避けるため、レスポンスにこのエラーメッセージをそのまま含めない）。
 * PR4 以降で Server Action / Route Handler からも throw する経路が増えた時点で、
 * 403 相当の返却などの記述を追記する。
 */
export class TenantAccessDeniedError extends Error {
  readonly tenantId: string
  readonly requestedSlug: string

  constructor(tenantId: string, requestedSlug: string) {
    super('Tenant slug mismatch for the current user.')
    this.name = 'TenantAccessDeniedError'
    this.tenantId = tenantId
    this.requestedSlug = requestedSlug
  }
}
