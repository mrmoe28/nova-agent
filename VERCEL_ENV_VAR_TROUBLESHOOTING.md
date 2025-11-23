# Vercel Environment Variable Troubleshooting

## Issue: BROWSERLESS_TOKEN not found in production

If you're getting the error "BROWSERLESS_TOKEN not configured" even though you've set it in Vercel, here are the steps to fix it:

## ✅ Step 1: Verify Environment Variable is Set

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project (`nova-agent`)
3. Go to **Settings** → **Environment Variables**
4. Look for `BROWSERLESS_TOKEN` in the list

## ✅ Step 2: Check Environment Scope

**CRITICAL**: Make sure the variable is set for **ALL environments**:
- ✅ Production
- ✅ Preview  
- ✅ Development

If it's only set for one environment, it won't be available in others.

## ✅ Step 3: Verify Variable Name

The variable name must be **exactly**: `BROWSERLESS_TOKEN`
- ❌ Wrong: `BROWSERLESS_TOKEN_` (trailing underscore)
- ❌ Wrong: `browserless_token` (lowercase)
- ❌ Wrong: `BROWSERLESS_API_TOKEN` (different name)
- ✅ Correct: `BROWSERLESS_TOKEN`

## ✅ Step 4: Redeploy After Adding Variable

**IMPORTANT**: After adding or updating environment variables in Vercel:
1. You must **redeploy** your application
2. Environment variables are only loaded at build/runtime
3. Go to **Deployments** → Click **"..."** → **Redeploy**

Or trigger a new deployment by pushing a commit.

## ✅ Step 5: Check Variable Value

Make sure the token value is correct:
- Should start with your Browserless token (no quotes needed)
- Example: `2TCivicArDMhJ9q0383ac7d302ef75f77c014b12b67f47d66`
- Don't include `token=` prefix
- Don't wrap in quotes

## ✅ Step 6: Verify via Vercel CLI

You can check if the variable is set using Vercel CLI:

```bash
vercel env ls
```

This will show all environment variables for your project.

## ✅ Step 7: Test Locally First

Before deploying, test locally:

1. Add to `.env.local`:
```bash
BROWSERLESS_TOKEN=your_token_here
```

2. Restart dev server:
```bash
npm run dev
```

3. Test scraping with browser mode enabled

## 🔍 Debugging: Check Runtime Environment

The code now logs whether the token is available. Check your Vercel function logs:
- Go to **Deployments** → Select deployment → **Functions** → View logs
- Look for: `hasToken: true/false` in error logs

## 🚀 Quick Fix Checklist

- [ ] Variable name is exactly `BROWSERLESS_TOKEN`
- [ ] Variable is set for Production, Preview, AND Development
- [ ] Variable value is correct (no quotes, no prefix)
- [ ] Application has been redeployed after setting variable
- [ ] Checked Vercel function logs for `hasToken` status

## 📝 Alternative: Use Standard Scraping

If you don't need browser mode, the scraper will automatically fall back to standard HTTP scraping when `BROWSERLESS_TOKEN` is not available. Browser mode is only needed for:
- JavaScript-heavy sites
- Sites with bot protection
- Dynamic content that requires JavaScript execution

Standard scraping works for most sites and doesn't require the Browserless token.


