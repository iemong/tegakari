import { TrashIcon } from "~components/icons"
import { useTheme } from "~lib/theme"
import type { Relation } from "~lib/types"

import {
  relationInstructionStyle,
  relationPairStyle,
  relationRowStyle,
  rowIconButtonStyle,
} from "./inbox-styles"

interface Props {
  relation: Relation
  onDelete: () => void
}

export function RelationRow({ relation, onDelete }: Props) {
  const { theme } = useTheme()
  return (
    <div style={relationRowStyle()}>
      <span style={relationPairStyle(theme)}>
        #{relation.fromId} ↔ #{relation.toId}
      </span>
      <span style={relationInstructionStyle(theme)}>{relation.instruction}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        style={rowIconButtonStyle}
        title="Delete relation">
        <TrashIcon color={theme.danger} />
      </button>
    </div>
  )
}
