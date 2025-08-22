"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string
  displayText?: string
  displayContent?: React.ReactNode
  onValueChange?: (value: string, displayText: string, displayContent: React.ReactNode) => void
  disabled: boolean
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within a Select')
  }
  return context
}

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, defaultValue, onValueChange, disabled = false, children }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue || "")
    const [displayText, setDisplayText] = React.useState("")
    const [displayContent, setDisplayContent] = React.useState<React.ReactNode>(null)
    const [open, setOpen] = React.useState(false)
    
    const currentValue = value !== undefined ? value : internalValue
    
    const handleValueChange = React.useCallback((newValue: string, newDisplayText: string, newDisplayContent: React.ReactNode) => {
      if (value === undefined) {
        setInternalValue(newValue)
      }
      setDisplayText(newDisplayText)
      setDisplayContent(newDisplayContent)
      onValueChange?.(newValue)
      setOpen(false)
    }, [value, onValueChange])

    const contextValue = React.useMemo(() => ({
      value: currentValue,
      displayText,
      displayContent,
      onValueChange: handleValueChange,
      disabled,
      open,
      setOpen
    }), [currentValue, displayText, displayContent, handleValueChange, disabled, open])

    return (
      <SelectContext.Provider value={contextValue}>
        <div ref={ref} className="relative">
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
)
SelectGroup.displayName = "SelectGroup"

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { displayContent } = useSelectContext()
    
    return (
      <span 
        ref={ref}
        className={cn("flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 justify-start", className)} 
        {...props}
      >
        {displayContent || placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  ({ className, children, onClick, ...props }, ref) => {
    const { open, setOpen, disabled } = useSelectContext()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return
      e.preventDefault()
      setOpen(!open)
      onClick?.(e)
    }

    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={handleClick}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "item-aligned"
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, position = "popper", ...props }, ref) => {
    const { open, setOpen } = useSelectContext()
    const contentRef = React.useRef<HTMLDivElement>(null)
    
    // Merge refs
    const mergedRef = React.useCallback((node: HTMLDivElement | null) => {
      contentRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref])

    // Close on click outside - but only for this Select instance
    React.useEffect(() => {
      if (!open) return
      
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        
        // Don't close if clicking within this select's content
        if (contentRef.current?.contains(target)) {
          return
        }
        
        // Find the closest select context by walking up the DOM
        let element = target as Element | null
        while (element) {
          // Don't close if clicking on any dropdown menu trigger or content
          if (element.hasAttribute?.('data-radix-dropdown-menu-trigger') || 
              element.hasAttribute?.('data-radix-dropdown-menu-content') ||
              element.closest?.('[data-radix-dropdown-menu-content]') ||
              element.closest?.('[data-radix-dropdown-menu-trigger]')) {
            return
          }
          
          // Don't close if clicking within the same select trigger
          const selectTrigger = element.closest?.('button[aria-haspopup="listbox"]')
          if (selectTrigger) {
            // Check if this trigger belongs to our select
            const triggerContent = selectTrigger.closest?.('.relative')
            const ourContent = contentRef.current?.closest?.('.relative')
            if (triggerContent === ourContent) {
              return
            }
          }
          
          element = element.parentElement
        }
        
        setOpen(false)
      }

      document.addEventListener('mousedown', handleClickOutside, { capture: true })
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, { capture: true })
      }
    }, [open, setOpen])

    // Close on escape
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('keydown', handleEscape)
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }, [open, setOpen])

    if (!open) return null

    return (
      <div
        ref={mergedRef}
        className={cn(
          "absolute z-50 max-h-96 min-w-[8rem] overflow-visible rounded-md border bg-popover text-popover-foreground shadow-md",
          "top-full mt-1 min-w-max",
          position === "popper" && "left-0",
          className
        )}
        {...props}
      >
        <div className="p-1 max-h-80 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = "SelectLabel"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  onSelect?: () => void
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, onSelect, onClick, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useSelectContext()
    const isSelected = selectedValue === value

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      
      // Extract text content from complex JSX children
      const extractTextFromChildren = (children: React.ReactNode): string => {
        if (typeof children === 'string') {
          return children
        }
        if (typeof children === 'number') {
          return children.toString()
        }
        if (Array.isArray(children)) {
          return children.map(extractTextFromChildren).join('')
        }
        if (React.isValidElement(children)) {
          return extractTextFromChildren((children.props as { children?: React.ReactNode }).children)
        }
        return ''
      }
      
      const displayText = extractTextFromChildren(children)
      onValueChange?.(value, displayText, children)
      onSelect?.()
      onClick?.(e)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        onClick={handleClick}
        role="option"
        aria-selected={isSelected}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected && <Check className="h-4 w-4" />}
        </span>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {children}
        </div>
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = "SelectSeparator"

// These are just for API compatibility - not needed in our custom implementation
const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
)
SelectScrollUpButton.displayName = "SelectScrollUpButton"

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
)
SelectScrollDownButton.displayName = "SelectScrollDownButton"

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}