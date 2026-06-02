import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

import { type Theme, useTheme } from "~lib/theme"
import type { Annotation } from "~lib/types"

import {
  headerActionsStyle,
  headerTextStyle,
  iconButtonStyle,
  idBadgeStyle,
  pinMarkerStyle,
  popoverContainerStyle,
  popoverStyle,
  popoverTextareaStyle,
  saveButtonStyle,
  tagCodeStyle,
  thumbnailStyle,
} from "./annotation-pin-styles"

interface Props {
  annotation: Annotation
  isActive: boolean
  onClick: () => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDelete: (id: number) => void
  onDeselect: () => void
}

export default function AnnotationPin(props: Props) {
  const { annotation, isActive, onClick, onUpdateInstruction, onDeselect } =
    props
  const { theme } = useTheme()
  const [draft, setDraft] = useState(annotation.instruction)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isActive) setDraft(annotation.instruction)
  }, [annotation.instruction, isActive])

  useEffect(() => {
    if (isActive) {
      setDraft(annotation.instruction)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }, [isActive, annotation.instruction])

  const handleSave = () => {
    onUpdateInstruction(annotation.id, draft)
    onDeselect()
  }

  // Convert document-relative position to viewport-relative
  const pos = {
    x: annotation.pageX - window.scrollX,
    y: annotation.pageY - window.scrollY,
  }

  return (
    <>
      <PinMarker
        pos={pos}
        id={annotation.id}
        isActive={isActive}
        theme={theme}
        onActivate={() => (isActive ? handleSave() : onClick())}
      />
      {isActive && (
        <PinPopover
          annotation={annotation}
          theme={theme}
          draft={draft}
          setDraft={setDraft}
          textareaRef={textareaRef}
          style={popoverStyle(pos)}
          onSave={handleSave}
          onDelete={props.onDelete}
          onDeselect={onDeselect}
        />
      )}
    </>
  )
}

interface PinMarkerProps {
  pos: { x: number; y: number }
  id: number
  isActive: boolean
  theme: Theme
  onActivate: () => void
}

function PinMarker({ pos, id, isActive, theme, onActivate }: PinMarkerProps) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onActivate()
      }}
      style={pinMarkerStyle(theme, pos, isActive)}>
      {id}
    </div>
  )
}

interface PinPopoverProps {
  annotation: Annotation
  theme: Theme
  draft: string
  setDraft: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement>
  style: CSSProperties
  onSave: () => void
  onDelete: (id: number) => void
  onDeselect: () => void
}

function PinPopover({
  annotation,
  theme,
  draft,
  setDraft,
  textareaRef,
  style,
  onSave,
  onDelete,
  onDeselect,
}: PinPopoverProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ ...style, ...popoverContainerStyle(theme) }}>
      <PinPopoverHeader
        annotation={annotation}
        theme={theme}
        onDelete={() => {
          onDelete(annotation.id)
          onDeselect()
        }}
      />
      {annotation.screenshot && (
        <img
          src={annotation.screenshot}
          alt="Element screenshot"
          style={thumbnailStyle(theme)}
        />
      )}
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => handlePopoverKey(e, onSave)}
        placeholder="指示を入力... (Cmd+Enter で保存)"
        rows={3}
        style={popoverTextareaStyle(theme)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.accent
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.border
        }}
      />
      <button onClick={onSave} style={saveButtonStyle(theme)}>
        Save
      </button>
    </div>
  )
}

interface PinPopoverHeaderProps {
  annotation: Annotation
  theme: Theme
  onDelete: () => void
}

function PinPopoverHeader({
  annotation,
  theme,
  onDelete,
}: PinPopoverHeaderProps) {
  const { tag, text } = annotation.elementInfo
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={idBadgeStyle(theme)}>{annotation.id}</span>
      <code style={tagCodeStyle(theme)}>{`<${tag}>`}</code>
      {text && (
        <span style={headerTextStyle(theme)}>
          {text.slice(0, 15)}
          {text.length > 15 ? "..." : ""}
        </span>
      )}
      <div style={headerActionsStyle}>
        <IconButton title="Delete" onClick={onDelete}>
          <TrashIcon color={theme.danger} />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button onClick={onClick} title={title} style={iconButtonStyle}>
      {children}
    </button>
  )
}

function handlePopoverKey(
  e: KeyboardEvent<HTMLTextAreaElement>,
  onSave: () => void
) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    onSave()
  }
  if (e.key === "Escape") {
    e.stopPropagation()
    onSave()
  }
}

function TrashIcon({ color }: { color: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
