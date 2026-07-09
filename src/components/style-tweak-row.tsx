import { stepNumericValue, toHexColor } from "~lib/style-preview"
import type { Theme } from "~lib/theme"

import type { StyleTweakRowState } from "./use-style-tweak-rows"
import {
  beforeValueStyle,
  colorSwatchInputStyle,
  propertyLabelStyle,
  rowContainerStyle,
  rowControlsStyle,
  rowHeaderStyle,
  rowResetButtonStyle,
  stepperButtonStyle,
  textInputStyle,
} from "./style-tweak-styles"

interface Props {
  theme: Theme
  row: StyleTweakRowState
  onChange: (value: string) => void
  onReset: () => void
}

/** One "Adjust styles" panel row: property name, before value, and a kind-specific value input. */
export default function StyleTweakRow({ theme, row, onChange, onReset }: Props) {
  return (
    <div style={rowContainerStyle}>
      <div style={rowHeaderStyle()}>
        <span style={propertyLabelStyle(theme)}>{row.property}</span>
        <span style={beforeValueStyle(theme)} title={`before: ${row.before}`}>
          {row.before}
        </span>
        <ResetButton theme={theme} onReset={onReset} />
      </div>
      <RowInput theme={theme} row={row} onChange={onChange} />
    </div>
  )
}

function ResetButton({ theme, onReset }: { theme: Theme; onReset: () => void }) {
  return (
    <button
      type="button"
      title="Reset"
      onClick={(e) => {
        e.stopPropagation()
        onReset()
      }}
      style={rowResetButtonStyle(theme)}>
      ↺
    </button>
  )
}

function RowInput({ theme, row, onChange }: Omit<Props, "onReset">) {
  const shared = { theme, property: row.property, value: row.value, onChange }
  if (row.kind === "color") return <ColorInput {...shared} />
  if (row.kind === "numeric") return <NumericInput {...shared} />
  return <TextInput {...shared} />
}

interface InputProps {
  theme: Theme
  property: string
  value: string
  onChange: (value: string) => void
}

function TextInput({ theme, property, value, onChange }: InputProps) {
  return (
    <input
      type="text"
      data-testid={`tegakari-style-value-${property}`}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      style={textInputStyle(theme)}
    />
  )
}

function NumericInput({ theme, property, value, onChange }: InputProps) {
  return (
    <div style={rowControlsStyle}>
      <button
        type="button"
        title="Decrease"
        onClick={(e) => {
          e.stopPropagation()
          onChange(stepNumericValue(value, -1))
        }}
        style={stepperButtonStyle(theme)}>
        −
      </button>
      <TextInput theme={theme} property={property} value={value} onChange={onChange} />
      <button
        type="button"
        title="Increase"
        onClick={(e) => {
          e.stopPropagation()
          onChange(stepNumericValue(value, 1))
        }}
        style={stepperButtonStyle(theme)}>
        +
      </button>
    </div>
  )
}

function ColorInput({ theme, property, value, onChange }: InputProps) {
  const hex = toHexColor(value)
  return (
    <div style={rowControlsStyle}>
      <input
        type="color"
        value={hex ?? "#000000"}
        disabled={!hex}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
        style={colorSwatchInputStyle(theme)}
      />
      <TextInput theme={theme} property={property} value={value} onChange={onChange} />
    </div>
  )
}
