import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

import AnnotationPin from "~components/AnnotationPin"
import HighlightBox from "~components/HighlightBox"
import Toolbar from "~components/Toolbar"
import { ThemeContext } from "~lib/theme"

import styleText from "data-text:~style.css"

import { useOverlay } from "./use-overlay"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = styleText
  return style
}

export default function Overlay() {
  const { isActive, ann, picking, close, theme, themeMode, toggleMode } =
    useOverlay()

  if (!isActive && ann.annotations.length === 0) return null

  return (
    <ThemeContext.Provider value={{ theme, mode: themeMode, toggleMode }}>
      {isActive && picking.hoveredRect && (
        <HighlightBox rect={picking.hoveredRect} />
      )}

      {ann.annotations.map((annotation) => (
        <AnnotationPin
          key={annotation.id}
          annotation={annotation}
          isActive={ann.activeId === annotation.id}
          onClick={() => ann.setActiveId(annotation.id)}
          onUpdateInstruction={ann.handleUpdateInstruction}
          onDelete={ann.handleDeleteAnnotation}
          onDeselect={() => ann.setActiveId(null)}
        />
      ))}

      <Toolbar
        annotations={ann.annotations}
        activeAnnotationId={ann.activeId}
        metadata={ann.metadata}
        onSelectAnnotation={ann.setActiveId}
        onDeleteAnnotation={ann.handleDeleteAnnotation}
        onClearAll={ann.handleClearAll}
        onClose={close}
        onImportAnnotations={ann.handleImportAnnotations}
      />
    </ThemeContext.Provider>
  )
}
