import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentWorkosUser } from "@/lib/auth/session";
import { getOwnedTenantSlugForCurrentUser } from "@/lib/tenant/current-tenant";
import { TenantNotFoundError } from "@/lib/tenant/errors";

export default async function HomePage() {
  const { user } = await getCurrentWorkosUser();

  let showTenantAssignmentError = false;
  let slug: string | null = null;

  if (user) {
    try {
      slug = await getOwnedTenantSlugForCurrentUser();
    } catch (err) {
      if (err instanceof TenantNotFoundError) {
        showTenantAssignmentError = true;
      } else {
        throw err;
      }
    }
  }

  if (slug) {
    redirect(`/admin/${slug}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Quartet</h1>
      <p className="mt-4 max-w-md text-base text-gray-600">
        個人サロン・クリニック向け業務管理システム
      </p>
      {showTenantAssignmentError && (
        <p className="mt-6 max-w-md rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ログインは成功しましたが、このアカウントには管理画面へのアクセス権が設定されていません。運営者までお問い合わせください。
        </p>
      )}
      <Link
        href="/sign-in"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800"
      >
        管理画面にログイン
      </Link>
      <p className="mt-6 text-xs text-gray-500">
        サロン運営者向けのログインページです
      </p>
    </main>
  );
}
