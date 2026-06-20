# Photo Moderation System - Deployment Guide

## Pre-Deployment Checklist

- [ ] Database migration prepared
- [ ] All components tested locally
- [ ] API endpoints tested with valid tokens
- [ ] Admin access verified in staging
- [ ] Supabase RLS policies reviewed
- [ ] Environment variables configured
- [ ] Team trained on moderation workflow
- [ ] Email notifications configured (optional)
- [ ] Monitoring alerts set up
- [ ] Rollback plan prepared

## Step 1: Database Migration

### Option A: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Create new migration
supabase migration new create_photo_moderation

# Copy the migration file contents
cp src/lib/db/migrations/002_create_photo_moderation.sql supabase/migrations/

# Push to remote database
supabase migration up --remote
supabase db push
```

### Option B: Manual SQL in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Create new query
4. Copy entire contents of `src/lib/db/migrations/002_create_photo_moderation.sql`
5. Execute the query
6. Verify tables were created

### Verification

Verify tables exist in Supabase:

```sql
-- Run these queries to verify setup
SELECT * FROM pg_tables WHERE tablename LIKE 'photo%';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename LIKE 'photo%';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename LIKE 'photo%';
```

## Step 2: Deploy to Staging

### Build & Test

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Build for production
npm run build

# Start production server locally
npm run start
```

### Test Photo Endpoints

```bash
# Get your Supabase token
export SUPABASE_TOKEN="your_admin_token"

# Test pending photos endpoint
curl -H "Authorization: Bearer $SUPABASE_TOKEN" \
  http://localhost:3000/api/admin/photos/pending

# Test statistics endpoint
curl -H "Authorization: Bearer $SUPABASE_TOKEN" \
  http://localhost:3000/api/admin/photos/stats
```

### Test UI in Staging

1. Deploy to staging environment
2. Navigate to `/admin`
3. Log in with admin account
4. Verify "Photo Moderation" appears in menu
5. Click and verify photos page loads
6. Create test data and verify photos display
7. Test approve/reject workflow
8. Test bulk operations
9. Verify audit logs are created

## Step 3: Configure Environment Variables

Create/update `.env.local` and `.env.production`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API configuration
NEXT_PUBLIC_API_URL=https://your-domain.com
NODE_ENV=production

# Optional: Email service (for notifications)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=admin@divdrop.com

# Optional: Monitoring
SENTRY_DSN=your_sentry_dsn
```

## Step 4: Deploy to Production

### Using Vercel (Recommended)

```bash
# Connect repository (if not already done)
vercel link

# Deploy to production
vercel --prod

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add SENDGRID_API_KEY

# Redeploy with environment variables
vercel --prod
```

### Using Docker

```bash
# Build Docker image
docker build -t dive-drop:latest .

# Tag for registry
docker tag dive-drop:latest your-registry/dive-drop:latest

# Push to registry
docker push your-registry/dive-drop:latest

# Deploy using your orchestration platform
# (Kubernetes, Docker Swarm, etc.)
```

## Step 5: Post-Deployment Verification

### Check Health Endpoints

```bash
# Verify API is responding
curl https://your-domain.com/api/health

# Test authentication
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/admin/photos/stats
```

### Verify UI

1. Visit https://your-domain.com/admin/photos
2. Verify page loads without errors
3. Test navigation between tabs
4. Test filtering and search
5. Test approve/reject on test photo
6. Check browser console for errors

### Check Database

```sql
-- Verify RLS is enforced
SELECT * FROM photos WHERE status = 'pending' LIMIT 1;

-- Check audit log
SELECT * FROM photo_moderation_audit ORDER BY created_at DESC LIMIT 5;
```

### Monitor Logs

```bash
# Check Vercel logs
vercel logs

# Check server logs
tail -f /var/log/application.log

# Check database logs
# In Supabase: Database > Logs
```

## Step 6: Set Up Monitoring

### Error Tracking (Sentry)

```typescript
// Already configured in application
// Errors will automatically report to Sentry
```

### Performance Monitoring

Monitor these key metrics:

1. **API Response Times**
   - GET /api/admin/photos/pending
   - POST /api/admin/photos/{id}/approve
   - POST /api/admin/photos/bulk

2. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Storage usage

3. **Frontend Performance**
   - Page load time
   - Image loading time
   - Component render time

### Alerting

Set up alerts for:

- API response time > 5 seconds
- Error rate > 1%
- Database connection failures
- Unauthorized access attempts
- Bulk operation failures

## Step 7: Train Admin Team

### Create Documentation

Provide admins with:
- How to access the moderation panel
- Understanding quality criteria
- Rejection reason guidelines
- Bulk operation procedures
- How to search/filter
- Understanding statistics

### Sample Training Script

```
1. Log in to admin panel
2. Click "Photo Moderation" in sidebar
3. View pending photos tab
4. Click on a photo to view details
5. Review quality assessment
6. For good photos: Click "Approve"
7. For bad photos: Click "Reject"
8. Select rejection reason
9. Add helpful notes (optional)
10. Confirm rejection
11. To bulk approve: Select multiple photos
12. Click "Approve All" in bulk panel
13. Confirm action
14. Check "Approved" tab to verify
```

### Best Practices Guide

1. **Quality Standards**
   - Sharpness: Image should be in focus
   - Lighting: Proper exposure without being too bright or dark
   - Composition: Well-framed with subject in focus
   - Content: Appropriate for platform, relevant to site/instructor

2. **Rejection Process**
   - Be specific about the reason
   - Add constructive feedback
   - Avoid being overly harsh
   - Provide actionable suggestions

3. **Consistency**
   - Document decisions
   - Hold calibration meetings
   - Regular audits of each moderator
   - Discuss edge cases as a team

4. **Efficiency**
   - Use bulk operations when possible
   - Filter by site/instructor to focus work
   - Take breaks to maintain quality
   - Monitor average review time per photo

## Step 8: Set Up Notifications (Optional)

### Email Notifications on Approval

Add to `/api/admin/photos/[id]/approve`:

```typescript
import { send } from '@sendgrid/mail';

// Send approval email
await send({
  to: photo.profiles.email,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: `Your photo "${photo.title}" has been approved!`,
  html: `
    <h2>Photo Approved</h2>
    <p>Great news! Your photo has been approved and is now visible.</p>
    <p><strong>Photo:</strong> ${photo.title}</p>
    <p>Thank you for contributing to DIVE DROP!</p>
  `,
});
```

### Email Notifications on Rejection

Add to `/api/admin/photos/[id]/reject`:

```typescript
import { send } from '@sendgrid/mail';

// Send rejection email
await send({
  to: photo.profiles.email,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: `Your photo needs revision`,
  html: `
    <h2>Photo Review</h2>
    <p>Thank you for your submission. Unfortunately, your photo didn't meet our standards.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    ${rejection_notes ? `<p><strong>Feedback:</strong> ${rejection_notes}</p>` : ''}
    <p>Please feel free to resubmit an improved version.</p>
  `,
});
```

## Step 9: Rollback Plan

If issues occur after deployment:

### Immediate Rollback

```bash
# If using Vercel
vercel rollback

# If using Git
git revert HEAD
git push origin main
```

### Database Rollback

If migration caused issues:

```sql
-- Disable RLS temporarily to diagnose
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;

-- Reset data if needed
DELETE FROM photo_moderation_audit;
DELETE FROM photo_rejections;
DELETE FROM photo_approvals;

-- Contact Supabase support for restore from backup
```

### Communication

1. Notify team of rollback
2. Document what went wrong
3. Fix issues locally
4. Re-test thoroughly
5. Deploy again

## Step 10: Post-Deployment Monitoring

### Daily Checks

- [ ] No errors in logs
- [ ] API response times normal
- [ ] Admin can access moderation panel
- [ ] Photos load correctly
- [ ] Approve/reject working
- [ ] Bulk operations successful
- [ ] Audit logs being created

### Weekly Checks

- [ ] Review moderation statistics
- [ ] Check average response times
- [ ] Review error logs
- [ ] Verify file storage usage
- [ ] Check database performance
- [ ] Review admin feedback
- [ ] Discuss any issues with team

### Monthly Checks

- [ ] Performance review
- [ ] Cost analysis
- [ ] Feature requests from admins
- [ ] Database optimization
- [ ] Security audit
- [ ] Backup verification
- [ ] Plan for next improvements

## Troubleshooting Deployment

### Issue: Photos table doesn't exist

```bash
# Verify migration ran
supabase migration list --remote

# Check Supabase Dashboard > SQL Editor for errors
# Re-run migration if needed
supabase migration up --remote
```

### Issue: 403 Forbidden errors

```bash
# Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'photos';

# Check admin role assignment
SELECT id, role FROM profiles WHERE role = 'admin';

# Verify auth token has correct claims
```

### Issue: Slow photo loading

```bash
# Check database indexes
SELECT * FROM pg_indexes WHERE tablename = 'photos';

# Add missing indexes
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_user_id ON photos(user_id);

# Check query performance
EXPLAIN ANALYZE SELECT * FROM photos WHERE status = 'pending';
```

### Issue: Bulk operations timeout

```
# Increase timeout in Next.js config
# vercel.json or next.config.js

{
  "functions": {
    "api/admin/photos/bulk": {
      "maxDuration": 300
    }
  }
}
```

## Performance Optimization

### Query Optimization

```sql
-- Verify indexes exist
SELECT * FROM pg_stat_user_indexes WHERE relname LIKE 'photos%';

-- Vacuum and analyze
VACUUM ANALYZE photos;
VACUUM ANALYZE photo_rejections;
VACUUM ANALYZE photo_moderation_audit;
```

### Caching Strategy

- Cache stats for 30 seconds
- Cache user profile data for 5 minutes
- Use service worker for image caching
- Enable HTTP caching headers

### Database Optimization

- Connection pooling
- Query batching for bulk operations
- Regular maintenance tasks
- Archive old audit logs monthly

## Success Criteria

After deployment, verify:

- ✅ All tables created successfully
- ✅ RLS policies enforced
- ✅ Admin can access `/admin/photos`
- ✅ Photos display correctly
- ✅ Approve/reject workflow works
- ✅ Bulk operations process correctly
- ✅ Audit logs created automatically
- ✅ Statistics calculated accurately
- ✅ No errors in browser console
- ✅ No errors in server logs
- ✅ API response time < 2 seconds
- ✅ Team can use system effectively

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)

## Support Contacts

- Technical Issues: Check logs and documentation
- Database Issues: Supabase Support
- Deployment Issues: Vercel Support
- Team Questions: Admin training material

---

**Deployment Status**: Ready to Deploy

Once all steps are complete, the Photo Moderation System will be live in production.
