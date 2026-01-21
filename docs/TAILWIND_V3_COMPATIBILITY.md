# Tailwind CSS v3 Compatibility Fix - Summary

## Problem Solved

The `@muhgholy/next-drive` package uses **Tailwind v4** internally, which outputs CSS with v4-specific syntax (`@layer`, `@property`) that breaks projects using **Tailwind v3**.

## Solution

The build process now:

1. **Compiles** CSS with Tailwind v4 CLI (to generate utility classes)
2. **Post-processes** the CSS with a PostCSS plugin to remove v4-specific syntax
3. **Minifies** the output with cssnano
4. **Auto-imports** the CSS in the exported JavaScript modules

## Implementation

### Files Created/Modified

1. **`scripts/postcss-v3-compat.cjs`** - PostCSS plugin that removes:
   - All `@layer` directives (empty and wrapped)
   - All `@property` declarations

2. **`scripts/process-css.cjs`** - Node.js script that orchestrates PostCSS processing

3. **`tsup.config.ts`** - Updated build pipeline:
   ```
   Tailwind v4 CLI → Temp CSS → PostCSS Processing → Final CSS (v3-compatible)
   ```

## Result

The exported `dist/client/index.css`:
- ✅ **49KB minified** (down from 63KB uncompressed)
- ✅ **0 `@layer` directives**
- ✅ **0 `@property` declarations**
- ✅ **v3-compatible** - works in both v3 and v4 projects
- ✅ **Auto-imported** - consumers get styles automatically

## Why This Approach?

Initially considered using regex-based post-processing, but switched to a **PostCSS plugin** because:
- More reliable (parses CSS properly)
- Cleaner code (no complex regex patterns)
- Standard PostCSS API
- Easier to maintain and extend

The only quirk is we use a Node.js script instead of PostCSS CLI because the CLI has issues resolving relative paths in config files.

## For Package Consumers

No changes needed! Just:

```tsx
import { DriveFileChooser } from '@muhgholy/next-drive/client';
```

The CSS is automatically included and won't conflict with Tailwind v3 setups.
