---
title: Unused Code Detection
impact: MEDIUM
impactDescription: reduces bundle size, improves maintainability, prevents confusion
tags: unused, dead-code, cleanup, maintenance
---

## Unused Code Detection

Identify and remove unused code to reduce bundle size, improve maintainability, and prevent developer confusion. No external tools required—use built-in IDE features and TypeScript compiler options.

### Detection Methods (No External Tools)

| Technique | How to Use |
|-----------|------------|
| Find All References | `Shift+F12` on any symbol - if only definition shows, it's unused |
| Grayed-out imports | IDE automatically dims unused imports |
| TypeScript errors | Enable `noUnusedLocals` and `noUnusedParameters` in tsconfig |
| Search codebase | Search for filename to find orphan files |

### tsconfig.json Settings (Built-in TypeScript)

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## 1. Unused Exports (`unused-dead-exports`)

**Pattern**: Export exists but "Find All References" shows only the definition.

**Incorrect:**

```tsx
// utils.ts - helperFunction is never imported anywhere
export const formatDate = (date: Date) => date.toISOString()
export const helperFunction = () => { /* never used */ }
```

**Correct:**

```tsx
// utils.ts - only export what's actually used
export const formatDate = (date: Date) => date.toISOString()
// helperFunction removed or kept as non-exported if used internally
```

---

## 2. Unreachable Code (`unused-unreachable-code`)

**Pattern**: Code after return, throw, break, or continue statements.

**Incorrect:**

```tsx
function processData(data: Data | null) {
  if (!data) {
    return null
  }
  return data.value
  console.log('processed') // unreachable - never executes
  sendAnalytics('processed') // unreachable
}
```

**Correct:**

```tsx
function processData(data: Data | null) {
  if (!data) {
    return null
  }
  console.log('processed')
  sendAnalytics('processed')
  return data.value
}
```

---

## 3. Unused Variables (`unused-variables`)

**Pattern**: Variable assigned but never read.

**Incorrect:**

```tsx
const Component = ({ items }: Props) => {
  const result = expensiveCalculation(items) // assigned but never used
  const count = items.length // assigned but never used
  
  return <div>{items.map(item => <Item key={item.id} item={item} />)}</div>
}
```

**Correct:**

```tsx
const Component = ({ items }: Props) => {
  // Remove unused variables entirely
  return <div>{items.map(item => <Item key={item.id} item={item} />)}</div>
}
```

---

## 4. Unused Imports (`unused-imports`)

**Pattern**: Import statement with no references in file. IDE typically grays these out.

**Incorrect:**

```tsx
import { useState, useEffect, useCallback } from 'react' // useCallback never used
import { Button, Card, Modal } from '@/components' // Modal never used

const Component = () => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log(count)
  }, [count])
  
  return <Card><Button onClick={() => setCount(c => c + 1)}>{count}</Button></Card>
}
```

**Correct:**

```tsx
import { useState, useEffect } from 'react'
import { Button, Card } from '@/components'

const Component = () => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    console.log(count)
  }, [count])
  
  return <Card><Button onClick={() => setCount(c => c + 1)}>{count}</Button></Card>
}
```

---

## 5. Unused Components (`unused-components`)

**Pattern**: Component defined but never rendered anywhere in the app.

**Detection**: Search the codebase for `<ComponentName` - if no results, it's unused.

**Incorrect:**

```tsx
// components/LegacyBanner.tsx - file exists but component never used
export const LegacyBanner = () => {
  return <div className="banner">Old feature announcement</div>
}
```

**Correct:**

```tsx
// Delete the file entirely, or if keeping for reference:
// Move to a /deprecated folder with a TODO comment
```

---

## 6. Unused Props (`unused-props`)

**Pattern**: Props destructured but never referenced in component body.

**Incorrect:**

```tsx
interface ButtonProps {
  label: string
  isLoading: boolean // passed to component but never used
  onClick: () => void
  variant: 'primary' | 'secondary' // defined but never used
}

const Button = ({ label, isLoading, onClick, variant }: ButtonProps) => {
  return <button onClick={onClick}>{label}</button>
}
```

**Correct:**

```tsx
interface ButtonProps {
  label: string
  onClick: () => void
}

const Button = ({ label, onClick }: ButtonProps) => {
  return <button onClick={onClick}>{label}</button>
}
```

---

## 7. Unused State (`unused-state`)

**Pattern**: useState where value is set but never read, or setter is never called.

**Incorrect:**

```tsx
const Component = () => {
  const [count, setCount] = useState(0) // count is set but never displayed
  const [isOpen, setIsOpen] = useState(false) // setIsOpen is never called
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      {isOpen && <Modal />}
    </div>
  )
}
```

**Correct:**

```tsx
const Component = () => {
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
    </div>
  )
}
```

---

## 8. Unused Effects (`unused-effects`)

**Pattern**: useEffect that doesn't cause observable side effects or set state.

**Incorrect:**

```tsx
const Component = ({ data }: Props) => {
  useEffect(() => {
    // Effect that does nothing observable
    const processed = data.map(item => item.value)
    console.log(processed) // only logs, no state change or side effect
  }, [data])
  
  return <div>{data.length} items</div>
}
```

**Correct:**

```tsx
const Component = ({ data }: Props) => {
  // Remove the effect if it has no purpose
  // Or make it actually do something:
  useEffect(() => {
    analytics.track('data_loaded', { count: data.length })
  }, [data])
  
  return <div>{data.length} items</div>
}
```

---

## 9. Commented-Out Code (`unused-commented-code`)

**Pattern**: Large blocks of commented code. Git preserves history—delete it.

**Incorrect:**

```tsx
const Component = () => {
  // const [oldState, setOldState] = useState(null)
  // 
  // useEffect(() => {
  //   fetchOldData().then(setOldState)
  // }, [])
  //
  // if (oldState) {
  //   return <OldComponent data={oldState} />
  // }
  
  return <NewComponent />
}
```

**Correct:**

```tsx
const Component = () => {
  return <NewComponent />
}
// If needed for reference, check git history: git log -p -- path/to/file.tsx
```

---

## Code Review Checklist

When reviewing code for unused items:

- [ ] Every export has at least one import (use Find All References)
- [ ] Every import is used in the file (check for grayed-out imports)
- [ ] Every prop is used in the component body
- [ ] Every useState value is read somewhere in render or effects
- [ ] Every useState setter is called somewhere
- [ ] No code exists after return/throw/break/continue
- [ ] No large commented-out code blocks
- [ ] No files that are never imported (search for filename)

---

## Finding Unused Files

To find potentially orphan files without external tools:

1. **Search for the filename** (without extension) across the codebase
2. **Check dynamic imports**: Search for `import(` and `lazy(` patterns
3. **Check route configs**: Files may be referenced in routing configuration
4. **Check package.json**: Entry points like `main`, `exports`, `bin`

```bash
# Search for references to a file
# In IDE: Cmd+Shift+F and search for "ComponentName" or "filename"
```

This approach relies entirely on built-in TypeScript, IDE features, and manual inspection.
