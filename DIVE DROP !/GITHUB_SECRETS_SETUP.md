# GitHub Secrets Setup Guide

This guide walks you through setting up all required secrets for the DIVE DROP CI/CD pipeline.

## Prerequisites

- GitHub repository owner/admin access
- Vercel account with DIVE DROP project
- Supabase project credentials
- Anthropic API key

## Step 1: Access GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. You'll see existing secrets and a "New repository secret" button

## Step 2: Add Required Secrets

Add each secret by clicking "New repository secret" and filling in Name and Value.

### 2.1 Vercel Configuration

#### VERCEL_TOKEN

**Where to get it:**
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: `github-cicd` or similar
4. Scope: **Full Access** (required for deployments)
5. Expiration: 90 days or longer
6. Click "Create"

**Value to paste:**
```
(Copy the entire token from Vercel)
```

**Verification:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://api.vercel.com/v1/teams/list
```

#### VERCEL_ORG_ID

**Where to get it:**
1. Go to https://vercel.com/account/settings
2. Look for "Team ID" or "Organization ID"
3. Or run: `vercel teams list` locally

**Value to paste:**
```
(Your Vercel team/org ID, usually starts with 'team_')
```

#### VERCEL_PROJECT_ID

**Where to get it:**
1. Open DIVE DROP project in Vercel
2. Go to **Settings** → **General**
3. Look for "Project ID"
4. Or run: `vercel projects list`

**Value to paste:**
```
(Your project ID, usually starts with 'prj_')
```

### 2.2 Supabase Configuration

#### NEXT_PUBLIC_SUPABASE_URL

**Where to get it:**
1. Go to Supabase Dashboard
2. Select your DIVE DROP project
3. Go to **Settings** → **API**
4. Copy the URL from "Project URL"

**Value to paste:**
```
https://xxxxx.supabase.co
```

**Note:** The `NEXT_PUBLIC_` prefix means this is safe to expose in the browser.

#### NEXT_PUBLIC_SUPABASE_ANON_KEY

**Where to get it:**
1. Supabase Dashboard → Your project
2. **Settings** → **API**
3. Under "Project API keys", copy the "anon" key (public)

**Value to paste:**
```
(Long string starting with 'eyJ')
```

**Note:** This key is public and only has anonymous access rights.

#### SUPABASE_SERVICE_ROLE_KEY

**⚠️ CRITICAL: Keep this secret! Never commit to git!**

**Where to get it:**
1. Supabase Dashboard → Your project
2. **Settings** → **API**
3. Under "Project API keys", copy the "service_role" key (SECRET)
4. **Only store in GitHub Secrets, NEVER in code**

**Value to paste:**
```
(Long string starting with 'eyJ', even longer than anon key)
```

**Security Notes:**
```bash
# ✓ DO: Use in GitHub Actions only
- name: Deploy
  env:
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

# ✗ DON'T: Ever commit this to git
# ✗ DON'T: Share in chat, email, or screenshots
# ✗ DON'T: Log this in console output
```

### 2.3 Anthropic Configuration

#### ANTHROPIC_API_KEY

**Where to get it:**
1. Go to https://console.anthropic.com/
2. Sign in with your Anthropic account
3. Go to **API Keys** section
4. Create a new key or copy existing one
5. **Keep this secret - it's your API key**

**Value to paste:**
```
sk-ant-...
```

**Security Notes:**
```bash
# ✓ Set usage limits in Anthropic Console
# ✗ Never expose in public repositories
# ✗ Rotate if suspected compromise
```

### 2.4 Deployment URLs

#### STAGING_APP_URL

**Where to get it:**
1. Go to your Vercel Dashboard
2. Create a preview branch deployment:
   ```bash
   git checkout develop
   vercel deploy  # This creates a preview URL
   ```
3. Or get from workflow logs after first deployment

**Value to paste:**
```
https://staging.dive-drop.vercel.app
```

**Or for custom domain:**
```
https://staging.yourdomain.com
```

#### PRODUCTION_APP_URL

**Where to get it:**
1. Your production domain
2. Should be set in Vercel project settings
3. Check your custom domain configuration

**Value to paste:**
```
https://dive-drop.app
```

## Step 3: Verify Secrets Are Set

```bash
# List all secrets (doesn't show values)
gh secret list

# Output should show:
# VERCEL_TOKEN
# VERCEL_ORG_ID
# VERCEL_PROJECT_ID
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY
# STAGING_APP_URL
# PRODUCTION_APP_URL
```

## Step 4: Set Up GitHub Environments

GitHub Environments allow different secrets for staging vs production, plus approval requirements.

### Create Staging Environment

1. Go to **Settings** → **Environments**
2. Click "New environment"
3. Name: `staging`
4. Click "Configure environment"

**Environment variables for staging:**
- No approval needed (development environment)
- Add any staging-specific overrides:
  - `NEXT_PUBLIC_APP_ENV`: `staging`

### Create Production Environment

1. Click "New environment"
2. Name: `production`
3. Click "Configure environment"

**Protection rules:**
- [x] **Required reviewers**: Check this
- Add 2+ senior team members as required reviewers
- Can be individuals or teams

**Deployment branches:**
- [x] "Selected branches"
- Add branch filter: `main`

**Environment variables for production:**
- `NEXT_PUBLIC_APP_ENV`: `production`
- Any production-specific overrides

## Step 5: Test the Setup

### Quick Test

```bash
# Trigger a test deployment
gh workflow run deploy-staging.yml

# Monitor it
gh run list --workflow=deploy-staging.yml --limit 1
gh run view <RUN_ID> --log
```

### Full Test Checklist

- [ ] Push to `develop` branch
  - Staging workflow should trigger automatically
  - Check: https://github.com/yourusername/dive-drop/actions

- [ ] Create a PR to `main`
  - CI workflow should run (lint, tests, type-check)
  - Must pass all checks before merge

- [ ] Merge PR to `main`
  - Deployment workflow should trigger
  - Will wait for approval from required reviewers
  - After approval, deploys to production

## Troubleshooting

### Secret Not Found in Workflow

**Problem:** Workflow says `VERCEL_TOKEN is not set`

**Solution:**
1. Verify secret name matches exactly (case-sensitive)
2. Verify secret is in repository (Settings → Secrets), not environment
3. Wait ~30 seconds after adding secret before running workflow
4. Re-run workflow after secret is added

### Vercel Deployment Fails

**Problem:** "Invalid token" error

**Solution:**
```bash
# 1. Verify token is valid
curl -H "Authorization: Bearer $YOUR_TOKEN" \
  https://api.vercel.com/v1/user

# 2. Check token scope (should be Full Access)
# Vercel → Account → Tokens

# 3. Re-create token if expired
# Vercel → Account → Tokens → New Token
gh secret set VERCEL_TOKEN -b "new-token"
```

### Supabase Connection Fails

**Problem:** "Authentication failed" or "Invalid key"

**Solution:**
```bash
# 1. Verify URL is correct (ends with .supabase.co)
gh secret get NEXT_PUBLIC_SUPABASE_URL | head -c 40

# 2. Verify keys are not swapped
# - ANON_KEY: shorter, for public access
# - SERVICE_ROLE_KEY: longer, for admin access

# 3. Check keys haven't been rotated in Supabase
# Supabase → Settings → API → Regenerate Keys
```

## Security Best Practices

### ✅ DO

```bash
# Use strong, unique tokens
# Store only in GitHub Secrets, not in code
# Rotate secrets monthly or after suspected exposure
# Use environment-specific secrets
# Audit who has access to secrets
# Use required reviewers for production
# Enable secret masking in logs
```

### ❌ DON'T

```bash
# ❌ Commit secrets to git (ever!)
# ❌ Paste secrets in chat or email
# ❌ Use personal API keys (create CI-specific ones)
# ❌ Store secrets in .env files in git
# ❌ Log secrets in console output
# ❌ Give secrets to people who don't need them
# ❌ Use same secrets for multiple projects
```

## Secret Rotation

### Quarterly Rotation

```bash
# 1. Create new tokens/keys in respective services
# 2. Update GitHub secrets
gh secret set VERCEL_TOKEN -b "new-token"
gh secret set ANTHROPIC_API_KEY -b "new-key"

# 3. Verify workflows use new secrets
# Run a test deployment

# 4. Revoke old tokens in respective services
# Vercel → Account → Tokens → Delete old token
# Anthropic → Console → API Keys → Delete old key
```

### Emergency Rotation (Security Breach)

```bash
# 1. IMMEDIATELY revoke compromised secret
#    (Delete from Vercel/Anthropic/Supabase)

# 2. Create new secret
# 3. Update GitHub secret
gh secret set COMPROMISED_SECRET -b "new-value"

# 4. Review recent workflow logs
gh run list --limit 20

# 5. Check for suspicious activity
#    - Vercel: Dashboard → Activity
#    - Anthropic: Console → Usage
#    - Supabase: Dashboard → Logs
```

## Reference: Secret Names to Add

Copy-paste ready:

| Secret Name | Source | Value |
|-------------|--------|-------|
| VERCEL_TOKEN | https://vercel.com/account/tokens | (Create token) |
| VERCEL_ORG_ID | https://vercel.com/account/settings | (Team ID) |
| VERCEL_PROJECT_ID | Vercel Dashboard → Project → Settings | (Project ID) |
| NEXT_PUBLIC_SUPABASE_URL | Supabase → Settings → API | (Project URL) |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → Settings → API → Keys | (Anon key) |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API → Keys | (Service role) |
| ANTHROPIC_API_KEY | https://console.anthropic.com/api_keys | (API key) |
| STAGING_APP_URL | Vercel Dashboard | (Staging URL) |
| PRODUCTION_APP_URL | Your domain settings | (Production URL) |

## What's Next?

1. ✅ Add all secrets above
2. ✅ Create staging and production environments
3. ✅ Invite team members as reviewers
4. ✅ Run test deployment (push to develop)
5. ✅ Test production approval flow (push to main)
6. ✅ Set up monitoring and alerts
7. ✅ Configure Slack notifications (optional)

## Getting Help

- GitHub Actions docs: https://docs.github.com/en/actions
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- Ask in team Slack or create a GitHub issue
