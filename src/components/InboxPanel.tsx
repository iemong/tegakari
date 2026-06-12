import { type ReactNode, useCallback, useState } from "react"

import { TrashIcon } from "~components/icons"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation, PageMetadata } from "~lib/types"

import { AnnotationRow } from "./annotation-row"
import { ShareBar } from "./share-bar"
import {
  clearButtonStyle,
  emptyStyle,
  headerStyle,
  listStyle,
  panelStyle,
  prefixInputStyle,
  prefixRowStyle,
} from "./inbox-styles"

interface Props {
  annotations: Annotation[]
  activeAnnotationId: number | null
  metadata: PageMetadata | null
  prefix: string
  matchedPrefix: string | null
  copiedItemId: number | null
  onPrefixChange: (value: string) => void
  onSelectAnnotation: (id: number) => void
  onCopyItem: (annotation: Annotation) => void
  onDeleteAnnotation: (id: number) => void
  onClearAll: () => void
  onImportAnnotations: (imported: Annotation[]) => void
}

export default function InboxPanel(props: Props) {
  const { theme } = useTheme()

  return (
    <div onClick={(e) => e.stopPropagation()} style={panelStyle(theme)}>
      <InboxHeader
        theme={theme}
        count={props.annotations.length}
        onClearAll={props.onClearAll}
        shareBar={
          <ShareBar
            theme={theme}
            annotations={props.annotations}
            metadata={props.metadata}
            onImportAnnotations={props.onImportAnnotations}
          />
        }
      />
      <PrefixInput
        theme={theme}
        prefix={props.prefix}
        matchedPrefix={props.matchedPrefix}
        onPrefixChange={props.onPrefixChange}
      />
      <AnnotationList theme={theme} items={props.annotations} props={props} />
    </div>
  )
}

interface HeaderProps {
  theme: Theme
  count: number
  onClearAll: () => void
  shareBar: ReactNode
}

function InboxHeader({ theme, count, onClearAll, shareBar }: HeaderProps) {
  const [confirmClear, setConfirmClear] = useState(false)

  const handleClearAll = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    onClearAll()
    setConfirmClear(false)
  }, [confirmClear, onClearAll])

  return (
    <div style={headerStyle(theme)}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>
        Annotations{count > 0 ? ` (${count})` : ""}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {shareBar}
        {count > 0 && (
          <button
            onClick={handleClearAll}
            style={clearButtonStyle(
              theme,
              confirmClear ? theme.danger : theme.textMuted
            )}
            title={confirmClear ? "Click again to confirm" : "Clear all"}>
            <TrashIcon color={confirmClear ? theme.danger : theme.textMuted} />
            {confirmClear && (
              <span style={{ fontSize: 10, fontWeight: 600 }}>Confirm?</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function PrefixInput({
  theme,
  prefix,
  matchedPrefix,
  onPrefixChange,
}: {
  theme: Theme
  prefix: string
  matchedPrefix: string | null
  onPrefixChange: (value: string) => void
}) {
  return (
    <div style={prefixRowStyle(theme)}>
      <input
        type="text"
        value={prefix}
        onChange={(e) => onPrefixChange(e.target.value)}
        placeholder="Prefix (e.g., [repo=my-app])"
        style={prefixInputStyle(theme, Boolean(matchedPrefix))}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.accent
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = matchedPrefix
            ? theme.accent
            : theme.border
        }}
      />
    </div>
  )
}

function AnnotationList({
  theme,
  items,
  props,
}: {
  theme: Theme
  items: Annotation[]
  props: Props
}) {
  if (items.length === 0) {
    return (
      <div style={listStyle}>
        <div style={emptyStyle(theme)}>
          Click elements on the page to annotate
        </div>
      </div>
    )
  }

  return (
    <div style={listStyle}>
      {items.map((annotation) => (
        <AnnotationRow
          key={annotation.id}
          annotation={annotation}
          isSelected={props.activeAnnotationId === annotation.id}
          copiedItemId={props.copiedItemId}
          onSelect={() => props.onSelectAnnotation(annotation.id)}
          onCopy={() => props.onCopyItem(annotation)}
          onDelete={() => props.onDeleteAnnotation(annotation.id)}
        />
      ))}
    </div>
  )
}
