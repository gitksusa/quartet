'use client'

import { useState, useTransition } from 'react'

import { saveTemplateAction } from './actions'

const TEMPLATES = [
  { id: 'atmosphere', name: 'Atmosphere（世界観型）' },
  { id: 'gallery',    name: 'Gallery（作品型）' },
  { id: 'staff',      name: 'Staff / Artist（人物型）' },
  { id: 'conversion', name: 'Menu / Conversion（予約特化型）' },
  { id: 'trust',      name: 'Trust / Treatment（信頼・技術型）' },
  { id: 'brand',      name: 'Brand / Multi Service（ブランド・複数サービス型）' },
] as const

type TemplateId = (typeof TEMPLATES)[number]['id']

export function Step1TemplatePicker({
  tenantSlug,
  currentTemplateType,
}: {
  tenantSlug: string
  currentTemplateType: string | null
}) {
  const [selected, setSelected] = useState<TemplateId | null>(
    TEMPLATES.some((t) => t.id === currentTemplateType)
      ? (currentTemplateType as TemplateId)
      : null,
  )
  const [isPending, startTransition] = useTransition()
  const isDirty = selected !== currentTemplateType

  return (
    <div className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id
          return (
            <li key={tpl.id}>
              <button
                type="button"
                onClick={() => setSelected(tpl.id)}
                aria-pressed={isSelected}
                className={
                  'w-full rounded-md border p-4 text-left transition-colors ' +
                  (isSelected
                    ? 'border-gray-900 bg-gray-50 ring-2 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400')
                }
              >
                <span className="block font-mono text-xs text-gray-500">{tpl.id}</span>
                <span className="mt-1 block text-sm font-medium">{tpl.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selected || !isDirty || isPending}
          onClick={() => {
            if (!selected) return
            startTransition(async () => {
              await saveTemplateAction(tenantSlug, selected)
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
