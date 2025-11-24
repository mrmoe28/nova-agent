## Script Errors and Fixes

### ERR_MODULE_NOT_FOUND when running a TS/Node script with `npx tsx`

- **Symptom**:
  - Error like:
    - `Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\...\nova-agent-main\scripts\full-scrape-from-url.ts'`
- **Cause**:
  - The command was run from the **wrong directory** (project root), while the script actually lives in the **inner app directory**: `nova-agent-main\nova-agent-main\scripts`.
- **Fix**:
  - Always `cd` into the inner app folder **first**, then run the script:

```powershell
cd "C:\Users\ekoso\Desktop\Project Directories\nova-agent-main\nova-agent-main"
npx tsx scripts/full-scrape-from-url.ts "https://ussolarsupplier.com/collections/solar-modules"
```



