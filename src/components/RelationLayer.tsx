import { resolveRelationGeometry } from "~lib/relation-geometry"
import { type Theme, useTheme } from "~lib/theme"
import type { Annotation, Relation } from "~lib/types"

import {
  labelCircleStyle,
  labelGroupStyle,
  labelTextStyle,
  lineStyle,
  pendingLineStyle,
  svgLayerStyle,
} from "./relation-layer-styles"
import { RelationPopover } from "./relation-popover"

export interface PendingRelation {
  fromId: number
  toId: number
}

interface Props {
  relations: Relation[]
  annotations: Annotation[]
  pendingRelation: PendingRelation | null
  activeRelationId: number | null
  onSelectRelation: (id: number) => void
  onDeselectRelation: () => void
  onUpdateInstruction: (id: number, instruction: string) => void
  onDeleteRelation: (id: number) => void
  onConfirmPending: (instruction: string) => void
  onCancelPending: () => void
}

/**
 * SVG layer connecting related pins with a line + numbered label (spec:
 * "要素間リレーション注釈"). One `<svg>` per overlay, sized to the viewport
 * and click-through except for the line/label groups themselves (see
 * `svgLayerStyle`/`labelGroupStyle`). Lines/labels track pin position using
 * the same `pageX/pageY - scroll` math as `AnnotationPin` — see
 * `~lib/relation-geometry`.
 */
export default function RelationLayer(props: Props) {
  const { theme } = useTheme()
  const scroll = { x: window.scrollX, y: window.scrollY }

  return (
    <>
      <svg style={svgLayerStyle}>
        {props.relations.map((r) => (
          <RelationEdge
            key={r.id}
            relation={r}
            annotations={props.annotations}
            scroll={scroll}
            theme={theme}
            isActive={props.activeRelationId === r.id}
            onSelect={() => props.onSelectRelation(r.id)}
          />
        ))}
        <PendingLine
          pendingRelation={props.pendingRelation}
          annotations={props.annotations}
          scroll={scroll}
          theme={theme}
        />
      </svg>
      <RelationPopovers {...props} scroll={scroll} theme={theme} />
    </>
  )
}

interface PendingLineProps {
  pendingRelation: PendingRelation | null
  annotations: Annotation[]
  scroll: { x: number; y: number }
  theme: Theme
}

function PendingLine({ pendingRelation, annotations, scroll, theme }: PendingLineProps) {
  const geo = pendingRelation
    ? resolveRelationGeometry(pendingRelation, annotations, scroll)
    : null
  if (!geo) return null
  return (
    <line x1={geo.from.x} y1={geo.from.y} x2={geo.to.x} y2={geo.to.y} style={pendingLineStyle(theme)} />
  )
}

interface PopoversProps extends Props {
  scroll: { x: number; y: number }
  theme: Theme
}

/** Renders whichever single popover applies: an active existing relation, or a not-yet-saved pending one (never both). */
function RelationPopovers(props: PopoversProps) {
  const { scroll, theme } = props
  const active = props.relations.find((r) => r.id === props.activeRelationId) ?? null
  const activeGeo = active ? resolveRelationGeometry(active, props.annotations, scroll) : null
  const pendingGeo = props.pendingRelation
    ? resolveRelationGeometry(props.pendingRelation, props.annotations, scroll)
    : null

  if (active && activeGeo) {
    return (
      <RelationPopover
        theme={theme}
        x={activeGeo.mid.x}
        y={activeGeo.mid.y}
        fromId={active.fromId}
        toId={active.toId}
        instruction={active.instruction}
        onSave={(text) => props.onUpdateInstruction(active.id, text)}
        onCancel={props.onDeselectRelation}
        onDelete={() => props.onDeleteRelation(active.id)}
      />
    )
  }
  if (props.pendingRelation && pendingGeo) {
    return (
      <RelationPopover
        theme={theme}
        x={pendingGeo.mid.x}
        y={pendingGeo.mid.y}
        fromId={props.pendingRelation.fromId}
        toId={props.pendingRelation.toId}
        instruction=""
        onSave={props.onConfirmPending}
        onCancel={props.onCancelPending}
      />
    )
  }
  return null
}

interface EdgeProps {
  relation: Relation
  annotations: Annotation[]
  scroll: { x: number; y: number }
  theme: Theme
  isActive: boolean
  onSelect: () => void
}

function RelationEdge({ relation, annotations, scroll, theme, isActive, onSelect }: EdgeProps) {
  const geo = resolveRelationGeometry(relation, annotations, scroll)
  if (!geo) return null
  return (
    <g
      style={labelGroupStyle}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}>
      <line x1={geo.from.x} y1={geo.from.y} x2={geo.to.x} y2={geo.to.y} style={lineStyle(theme, isActive)} />
      <circle cx={geo.mid.x} cy={geo.mid.y} r={9} style={labelCircleStyle(theme, isActive)} />
      <text
        x={geo.mid.x}
        y={geo.mid.y}
        style={labelTextStyle(theme, isActive)}
        textAnchor="middle"
        dominantBaseline="central">
        {relation.id}
      </text>
    </g>
  )
}
