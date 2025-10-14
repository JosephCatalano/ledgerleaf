"use client"
import * as React from "react"

/**
 * Minimal Select wrapper that mirrors the named exports used in the app.
 * It's not a full Radix UI replacement but matches the API used in your table.
 */

function Select({ value, onValueChange, children }: {
  value?: string
  onValueChange?: (v: string) => void
  children?: React.ReactNode
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {children}
      </select>
    </div>
  )
}

function SelectTrigger({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props}>
      {children}
    </div>
  )
}

function SelectValue({ children, placeholder, ...props }: React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }) {
  return <span {...props}>{children ?? placeholder}</span>
}

function SelectContent({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props}>{children}</div>
}

function SelectItem({ value, children, ...props }: React.OptionHTMLAttributes<HTMLOptionElement> & { value: string }) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }