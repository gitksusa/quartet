import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Quartet</h1>
      <p className="mt-4 max-w-md text-base text-gray-600">
        個人サロン・クリニック向け業務管理システム
      </p>
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
