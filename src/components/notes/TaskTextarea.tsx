"use client"

import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from "react"
import { Circle, CheckCircle2 } from "lucide-react"

interface TaskTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function TaskTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder = "",
  className = "",
  minHeight = "200px",
}: TaskTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Check if we have complete task patterns
  const hasCompleteTasks = /^- \[[ xX]\]/m.test(value)

  // Toggle task state
  const toggleTask = useCallback((lineIndex: number) => {
    const lines = value.split("\n")
    const line = lines[lineIndex]

    const uncheckedMatch = line.match(/^(- \[ \])(.*)$/)
    const checkedMatch = line.match(/^(- \[[xX]\])(.*)$/)

    if (uncheckedMatch) {
      lines[lineIndex] = `- [x]${uncheckedMatch[2]}`
    } else if (checkedMatch) {
      lines[lineIndex] = `- [ ]${checkedMatch[2]}`
    }

    onChange(lines.join("\n"))
  }, [value, onChange])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        const textarea = e.currentTarget
        const { selectionStart } = textarea
        const lines = value.substring(0, selectionStart).split("\n")
        const currentLine = lines[lines.length - 1]

        // Check if current line is a task
        const taskMatch = currentLine.match(/^- \[([ xX])\](.*)$/)
        if (taskMatch) {
          const taskContent = taskMatch[2]
          // If task is empty, remove the prefix
          if (!taskContent.trim()) {
            e.preventDefault()
            const lineStart = selectionStart - currentLine.length
            const newValue = value.substring(0, lineStart) + value.substring(selectionStart)
            onChange(newValue)
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart)
            }, 0)
            return
          }
          // Otherwise, add new task
          e.preventDefault()
          const insertion = "\n- [ ] "
          const newValue = value.substring(0, selectionStart) + insertion + value.substring(selectionStart)
          onChange(newValue)
          setTimeout(() => {
            const newPos = selectionStart + insertion.length
            textarea.setSelectionRange(newPos, newPos)
          }, 0)
          return
        }

        // Check if current line is a list item
        const listMatch = currentLine.match(/^- (.*)$/)
        if (listMatch && !taskMatch) {
          const listContent = listMatch[1]
          if (!listContent.trim()) {
            e.preventDefault()
            const lineStart = selectionStart - currentLine.length
            const newValue = value.substring(0, lineStart) + value.substring(selectionStart)
            onChange(newValue)
            setTimeout(() => {
              textarea.setSelectionRange(lineStart, lineStart)
            }, 0)
            return
          }
          e.preventDefault()
          const insertion = "\n- "
          const newValue = value.substring(0, selectionStart) + insertion + value.substring(selectionStart)
          onChange(newValue)
          setTimeout(() => {
            const newPos = selectionStart + insertion.length
            textarea.setSelectionRange(newPos, newPos)
          }, 0)
        }
      }

      // Call external handler if provided
      onKeyDown?.(e)
    },
    [value, onChange, onKeyDown]
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.max(parseInt(minHeight), textareaRef.current.scrollHeight) + "px"
    }
  }, [value, minHeight])

  // If no tasks, show simple textarea
  if (!hasCompleteTasks) {
    return (
      <div
        className={`relative rounded-xl ${className}`}
        style={{
          background: "#F9F9F9",
          border: isFocused ? "1px solid #0064FA" : "1px solid transparent",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full p-4 text-sm resize-none outline-none bg-transparent"
          style={{
            minHeight,
            color: "#333333",
            lineHeight: "1.5em",
          }}
        />
      </div>
    )
  }

  // Render with task circles
  const lines = value.split("\n")

  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: "#F9F9F9",
        border: isFocused ? "1px solid #0064FA" : "1px solid transparent",
        minHeight,
      }}
    >
      <div className="p-4 space-y-0">
        {lines.map((line, idx) => {
          const uncheckedMatch = line.match(/^(- \[ \])(.*)$/)
          const checkedMatch = line.match(/^(- \[[xX]\])(.*)$/)

          if (uncheckedMatch || checkedMatch) {
            const isChecked = !!checkedMatch
            const content = isChecked ? checkedMatch![2] : uncheckedMatch![2]

            return (
              <div key={idx} className="flex items-start gap-2 min-h-[1.75em]">
                <button
                  type="button"
                  onClick={() => toggleTask(idx)}
                  className="flex-shrink-0 mt-0.5 p-0.5 rounded hover:bg-white/50 transition-colors"
                >
                  {isChecked ? (
                    <CheckCircle2 className="w-4 h-4" style={{ color: "#28B95F" }} />
                  ) : (
                    <Circle className="w-4 h-4" style={{ color: "#CCCCCC" }} />
                  )}
                </button>
                <input
                  type="text"
                  value={content}
                  onChange={(e) => {
                    const newLines = [...lines]
                    const prefix = isChecked ? "- [x]" : "- [ ]"
                    newLines[idx] = prefix + e.target.value
                    onChange(newLines.join("\n"))
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (!content.trim()) {
                        // Remove empty task
                        const newLines = lines.filter((_, i) => i !== idx)
                        onChange(newLines.join("\n"))
                      } else {
                        // Add new task after this one
                        const newLines = [...lines]
                        newLines.splice(idx + 1, 0, "- [ ] ")
                        onChange(newLines.join("\n"))
                        // Focus the new input after render
                        setTimeout(() => {
                          const inputs = document.querySelectorAll('[data-task-input]')
                          const nextInput = inputs[idx + 1] as HTMLInputElement
                          nextInput?.focus()
                        }, 10)
                      }
                    } else if (e.key === "Backspace" && !content) {
                      e.preventDefault()
                      const newLines = lines.filter((_, i) => i !== idx)
                      onChange(newLines.join("\n"))
                      // Focus previous input
                      setTimeout(() => {
                        const inputs = document.querySelectorAll('[data-task-input]')
                        const prevInput = inputs[idx - 1] as HTMLInputElement
                        prevInput?.focus()
                      }, 10)
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  data-task-input
                  className={`flex-1 bg-transparent outline-none text-sm ${isChecked ? "line-through opacity-50" : ""}`}
                  style={{ color: "#333333", lineHeight: "1.5em" }}
                  placeholder="Nouvelle tâche..."
                />
              </div>
            )
          }

          // Regular line - use textarea-like input
          return (
            <div key={idx} className="min-h-[1.75em]">
              <input
                type="text"
                value={line}
                onChange={(e) => {
                  const newLines = [...lines]
                  newLines[idx] = e.target.value
                  onChange(newLines.join("\n"))
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    const newLines = [...lines]
                    newLines.splice(idx + 1, 0, "")
                    onChange(newLines.join("\n"))
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: "#333333", lineHeight: "1.5em" }}
                placeholder={idx === 0 ? placeholder : ""}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
