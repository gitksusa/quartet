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
