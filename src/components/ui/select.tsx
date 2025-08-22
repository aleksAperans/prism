"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextType {
  value?: string
  displayText?: string
  displayContent?: React.ReactNode
  onValueChange?: (value: string, displayText: string, displayContent: React.ReactNode) => void
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
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, defaultValue, onValueChange, children }, ref) => {
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
      open,
      setOpen
    }), [currentValue, displayText, displayContent, handleValueChange, open])

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
    const { displayContent, displayText, value } = useSelectContext()
    
    return (
      <span 
        ref={ref}
        className={cn("block truncate", className)} 
        {...props}
      >
        {displayContent || placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const { open, setOpen } = useSelectContext()
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setOpen(!open)
      onClick?.(e)
    }

    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={handleClick}
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

    // Close on click outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
          setOpen(false)
        }
      }

      if (open) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
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
        ref={contentRef}
        className={cn(
          "absolute z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 top-full mt-1 w-full",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <div className="p-1 max-h-80 overflow-y-auto">
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
          return extractTextFromChildren(children.props.children)
        }
        return ''
      }
      
      const displayText = extractTextFromChildren(children)
      onValueChange?.(value, displayText, children)
      onSelect?.(value)
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
        {children}
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