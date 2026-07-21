'use client'

import { useState, useTransition } from 'react'

import {
  isTemplateTypeId,
  MOODS,
  RECOMMENDED_MOODS_BY_TEMPLATE,
  type MoodId,
} from '@/lib/constants/site-settings'

import { saveMoodAction } from './actions'

export function Step2MoodPicker({
  tenantSlug,
  currentTemplateType,
  currentMood,
}: {
  tenantSlug: string
  currentTemplateType: string | null
  currentMood: MoodId | null
}) {
  const [selected, setSelected] = useState<MoodId | null>(currentMood)
  const [isPending, startTransition] = useTransition()
  const isDirty = selected !== currentMood
  const isBlocked = currentTemplateType === null

  // おすすめ順に並び替え（currentTemplateType が既知の場合のみ）。
  // 順位はテンプレごとの RECOMMENDED_MOODS_BY_TEMPLATE 定数から取得。
  // recommendedTopId は「おすすめ」バッジ判定に使う。表示配列の先頭位置に依存
  // すると、将来並び順ロジック変更時にバッジ位置がずれるため、id で明示比較する。
  const { orderedMoods, recommendedTopId } = ((): {
    orderedMoods: (typeof MOODS)[number][]
    recommendedTopId: MoodId | null
  } => {
    if (currentTemplateType && isTemplateTypeId(currentTemplateType)) {
      const order = RECOMMENDED_MOODS_BY_TEMPLATE[currentTemplateType]
      const byId = new Map(MOODS.map((m) => [m.id, m]))
      const sorted = order
        .map((id) => byId.get(id))
        .filter((m): m is (typeof MOODS)[number] => m !== undefined)
      const rest = MOODS.filter((m) => !order.includes(m.id))
      return { orderedMoods: [...sorted, ...rest], recommendedTopId: order[0] ?? null }
    }
    return { orderedMoods: [...MOODS], recommendedTopId: null }
  })()

  return (
    <div className="space-y-4">
      {isBlocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          先に STEP1 でテンプレートを保存してください。
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orderedMoods.map((mood) => {
          const isSelected = selected === mood.id
          const isRecommended = !isBlocked && recommendedTopId !== null && mood.id === recommendedTopId
          return (
            <li key={mood.id}>
              <button
                type="button"
                onClick={() => setSelected(mood.id)}
                aria-pressed={isSelected}
                className={
                  'w-full rounded-md border p-4 text-left transition-colors ' +
                  (isSelected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-900 hover:border-gray-400')
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      'font-mono text-xs ' +
                      (isSelected ? 'text-gray-300' : 'text-gray-500')
                    }
                  >
                    {mood.id}
                  </span>
                  {isRecommended ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      おすすめ
                    </span>
                  ) : null}
                </div>
                <span className="mt-1 block text-sm font-medium">{mood.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selected || !isDirty || isPending || isBlocked}
          onClick={() => {
            if (!selected) return
            startTransition(async () => {
              await saveMoodAction(tenantSlug, selected)
            })
          }}
          className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
