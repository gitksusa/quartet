import { getOwnerTenantSiteSettings } from "@/lib/tenant/site-settings";

const COMMON_SECTIONS = [
  "hero",
  "concept",
  "features",
  "gallery",
  "menu",
  "staff",
  "voice",
  "access",
  "reservation",
  "campaign",
  "faq",
  "recruit_cta",
] as const;

export default async function AdminTenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { templateType } = await getOwnerTenantSiteSettings(tenantSlug);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <header className="mb-8">
        <p className="text-sm text-gray-500">テナント</p>
        <h1 className="text-2xl font-bold">{tenantSlug}</h1>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">サイト設定</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">テンプレート</dt>
          <dd className="text-gray-900">
            {templateType ?? <span className="text-gray-400">未設定</span>}
          </dd>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">共通セクション</h2>
        <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {COMMON_SECTIONS.map((id) => (
            <li
              key={id}
              className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              {id}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">管理機能</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-md border border-gray-200 p-6">
            <h3 className="text-base font-semibold">テンプレート選択</h3>
            <p className="mt-2 text-sm text-gray-600">
              HP テンプレートを選択・切り替えます。
            </p>
            <span className="mt-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              準備中
            </span>
          </article>
          <article className="rounded-md border border-gray-200 p-6">
            <h3 className="text-base font-semibold">セクション編集</h3>
            <p className="mt-2 text-sm text-gray-600">
              各セクションのテキスト・表示 ON/OFF を編集します。
            </p>
            <span className="mt-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              準備中
            </span>
          </article>
          <article className="rounded-md border border-gray-200 p-6">
            <h3 className="text-base font-semibold">画像管理</h3>
            <p className="mt-2 text-sm text-gray-600">
              セクション画像のアップロードと差し替えを行います。
            </p>
            <span className="mt-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              準備中
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}
