# Tailwind CSS v3 Compatibility Fix - Summary

## Problem Solved

The `@muhgholy/next-drive` package uses **Tailwind v4** internally, which outputs CSS with v4-specific syntax (`@layer`, `@property`) that breaks projects using **Tailwind v3**.

## Solution

The build process now:

1. **Compiles** CSS with Tailwind v4 CLI (to generate utility classes)
2. **Post-processes** the CSS with a PostCSS plugin to remove v4-specific syntax
3. **Minifies** the output with cssnano
4. **Auto-injects** the CSS **only when the `DriveFileChooser` component is used**.

## Implementation

### Files Created/Modified

1. **`scripts/post-process-css.js`** (Obsolete) -> **`scripts/postcss-v3-compat.cjs`** / **`scripts/process-css.cjs`**
   - Strips v4 syntax (`@layer`, `@property`).

2. **`src/client/style-injector.ts`**
   - React hook that injects the CSS into `<head>` at runtime.

3. **`src/client/file-chooser.tsx`**
   - Calls the injector hook.

4. **`tsup.config.ts`**
   - Compiles CSS.
   - Reads the CSS content.
   - **Replaces a placeholder** in the compiled JS bundles with the actual CSS string.
   - This embeds the styles directly into the component code.

## Result

- ✅ **Component-Scoped**: Styles only load when you use `DriveFileChooser`.
- ✅ **Zero Config**: No need to import a CSS file manually.
- ✅ **v3-Compatible**: The injected CSS is clean and won't break Tailwind v3.
- ✅ **Clean Global Scope**: No global side-effects unless the component is mounted.

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
