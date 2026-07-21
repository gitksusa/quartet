'use client'

import { useState, useTransition } from 'react'

import { TEMPLATE_TYPES, type TemplateTypeId } from '@/lib/constants/site-settings'

import { saveTemplateAction } from './actions'

export function Step1TemplatePicker({
  tenantSlug,
  currentTemplateType,
}: {
  tenantSlug: string
  currentTemplateType: string | null
}) {
  const [selected, setSelected] = useState<TemplateTypeId | null>(
    TEMPLATE_TYPES.some((t) => t.id === currentTemplateType)
      ? (currentTemplateType as TemplateTypeId)
      : null,
  )
  const [isPending, startTransition] = useTransition()
  const isDirty = selected !== currentTemplateType

  return (
    <div className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_TYPES.map((tpl) => {
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
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-900 hover:border-gray-400')
                }
              >
                <span
                  className={
                    'block font-mono text-xs ' +
                    (isSelected ? 'text-gray-300' : 'text-gray-500')
                  }
                >
                  {tpl.id}
                </span>
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
