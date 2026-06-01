import type { ReactNode } from "react"

import { CopyIcon, TrashIcon } from "~components/icons"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation } from "~lib/types"

import {
  codeStyle,
  idBadgeStyle,
  instructionStyle,
  rowHeaderStyle,
  rowIconButtonStyle,
  rowStyle,
  rowTextStyle,
  thumbStyle,
} from "./inbox-styles"

interface RowProps {
  annotation: Annotation
  isSelected: boolean
  copiedItemId: number | null
  onSelect: () => void
  onCopy: () => void
  onDelete: () => void
}

export function AnnotationRow({
  annotation,
  isSelected,
  copiedItemId,
  onSelect,
  onCopy,
  onDelete,
}: RowProps) {
  const { theme } = useTheme()
  const copied = copiedItemId === annotation.id

  return (
    <div onClick={onSelect} style={rowStyle(theme, isSelected, false)}>
      <div style={rowHeaderStyle(Boolean(annotation.instruction))}>
        <span style={idBadgeStyle(theme, isSelected)}>{annotation.id}</span>
        <code style={codeStyle(theme)}>{`<${annotation.elementInfo.tag}>`}</code>
        <RowText theme={theme} text={annotation.elementInfo.text} />
        {annotation.screenshot && (
          <img src={annotation.screenshot} alt="" style={thumbStyle(theme)} />
        )}
        <RowActions
          theme={theme}
          copied={copied}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      </div>
      {annotation.instruction && (
        <div style={instructionStyle(theme)}>{annotation.instruction}</div>
      )}
    </div>
  )
}

function RowText({ theme, text }: { theme: Theme; text?: string }) {
  if (!text) return null
  return (
    <span style={rowTextStyle(theme)}>
      {text.slice(0, 20)}
      {text.length > 20 ? "..." : ""}
    </span>
  )
}

interface RowActionsProps {
  theme: Theme
  copied: boolean
  onCopy: () => void
  onDelete: () => void
}

function RowActions({ theme, copied, onCopy, onDelete }: RowActionsProps) {
  return (
    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
      <RowIconButton title={copied ? "Copied!" : "Copy"} onClick={onCopy}>
        <CopyIcon color={copied ? theme.success : theme.textMuted} />
      </RowIconButton>
      <RowIconButton title="Delete" onClick={onDelete}>
        <TrashIcon color={theme.danger} />
      </RowIconButton>
    </div>
  )
}

function RowIconButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      style={rowIconButtonStyle}
      title={title}>
      {children}
    </button>
  )
}
