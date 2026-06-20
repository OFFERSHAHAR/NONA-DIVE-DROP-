# DIVE DROP Security Checklist

**Pre-Launch Verification Guide**

**Version:** 1.0  
**Last Updated:** June 20, 2026  
**Status:** Ready for Production Audit

---

## Executive Summary

This checklist ensures all security requirements are met before production launch. Use this to:
- Verify security implementation
- Document compliance
- Identify gaps
- Sign off on release

**Estimated Time:** 4-6 hours for complete audit  
**Required Roles:** Security Lead, Tech Lead, DevOps  
**Sign-Off Required:** ✅ All checkboxes must be complete

---

## Part 1: Authentication & Authorization

### 1.1 User Authentication

- [ ] **Supabase Auth Configured**
  - [ ] Email/password authentication enabled
  - [ ] Email verification required
  - [ ] Password complexity enforced (min 8 chars, uppercase, number)
  - [ ] Session timeout configured (1 hour for access token)
  - [ ] Test: Create account → receive verification email → verify

- [ ] **Token Security**
  - [ ] Access tokens stored in HttpOnly cookies (JavaScript cannot read)
  - [ ] Secure flag set (HTTPS only in production)
  - [ ] SameSite flag set to "lax" (CSRF protection)
  - [ ] Refresh tokens with longer expiration (7 days)
  - [ ] Test: Use browser DevTools to verify cookie flags

- [ ] **Token Rotation**
  - [ ] Refresh token rotation implemented
  - [ ] Token family tracking enabled
  - [ ] Token reuse attacks detected and logged
  - [ ] All user tokens revoked on logout
  - [ ] Test: Logout from one device → other devices should also logout

- [ ] **Session Management**
  - [ ] Sessions stored in database (not memory)
  - [ ] Session timeout enforced (1 hour inactivity)
  - [ ] Multi-device logout working
  - [ ] Session audit logging enabled
  - [ ] Test: Session operations logged in audit_log table

### 1.2 Authorization & Permissions

- [ ] **Permission Matrix**
  - [ ] Anonymous: Can view public listings only
  - [ ] Registered: Can create listings, express interest, request contact
  - [ ] Owner: Can manage own listings
  - [ ] Admin: Full access + moderation
  - [ ] Test: Try unauthorized actions → should be blocked

- [ ] **Role-Based Access Control (RBAC)**
  - [ ] User roles assigned correctly
  - [ ] Permission checks on all sensitive operations
  - [ ] Server-side authorization (never trust client)
  - [ ] Ownership checks for resource mutations
  - [ ] Test: Non-owner tries to delete listing → should fail

- [ ] **Admin Access**
  - [ ] Admin endpoints protected
  - [ ] Admin role verified on every admin request
  - [ ] Admin actions logged with user info
  - [ ] Admin password reset via secure flow
  - [ ] Test: Non-admin tries /admin/users → should be blocked

---

## Part 2: Data Protection

### 2.1 Database Security

- [ ] **Row-Level Security (RLS) Enabled**
  - [ ] RLS policies defined for all tables
  - [ ] Policies tested individually
  - [ ] No table accessible without RLS
  - [ ] Policies prevent cross-user access
  - [ ] Test: User A cannot see User B's private data

- [ ] **Field-Level Visibility**
  - [ ] Contact info (email, phone) hidden by default
  - [ ] Contact info only visible after mutual reveal
  - [ ] Blocked users' emails invisible
  - [ ] Admin emails not visible to regular users
  - [ ] Test: Query contact info directly → RLS blocks

- [ ] **SQL Injection Prevention**
  - [ ] All queries use parameterized statements
  - [ ] No string concatenation in SQL
  - [ ] Supabase client library used (automatic escaping)
  - [ ] Input validation with Zod before database
  - [ ] Test: Try SQL injection payload → should fail safely

- [ ] **Database Backups**
  - [ ] Automatic daily backups enabled (Supabase)
  - [ ] 30-day backup retention
  - [ ] Backup encryption enabled
  - [ ] Test backup restore (staging environment)
  - [ ] Documented recovery procedure

### 2.2 Input Validation

- [ ] **Client-Side Validation**
  - [ ] All form fields validated with Zod
  - [ ] Email format validated
  - [ ] Date format validated
  - [ ] String lengths limited
  - [ ] Test: Submit invalid data → should show error

- [ ] **Server-Side Validation**
  - [ ] ALL inputs re-validated on server
  - [ ] Type checking with Zod
  - [ ] Range limits enforced
  - [ ] Enum values validated
  - [ ] Test: Bypass client validation → server rejects

- [ ] **Injection Prevention**
  - [ ] HTML special characters escaped
  - [ ] No eval() or dangerously_set_inner_html
  - [ ] Content Security Policy prevents inline scripts
  - [ ] Test: Try XSS payload → should be escaped

- [ ] **File Upload Security**
  - [ ] File type whitelist enforced
  - [ ] File size limits set
  - [ ] File signatures validated (magic bytes)
  - [ ] Files stored outside web root
  - [ ] Antivirus scan enabled (optional)
  - [ ] Test: Upload malicious file → should be rejected

---

## Part 3: Network Security

### 3.1 HTTPS & Transport

- [ ] **HTTPS Enforced**
  - [ ] All pages served over HTTPS
  - [ ] HTTP → HTTPS redirect in place
  - [ ] HSTS header set (max-age=31536000)
  - [ ] HSTS preload list submitted
  - [ ] Test: Visit http://domain → should redirect

- [ ] **TLS Configuration**
  - [ ] TLS 1.2+ only (no SSL 3.0, TLS 1.0, 1.1)
  - [ ] Strong ciphers enabled
  - [ ] Perfect Forward Secrecy (PFS) enabled
  - [ ] Test: SSL Labs score A+

- [ ] **Certificate Management**
  - [ ] SSL certificate from trusted CA
  - [ ] Certificate auto-renewal configured
  - [ ] Certificate expiration monitored
  - [ ] Alert set for 30 days before expiration

### 3.2 CORS & Origin Validation

- [ ] **CORS Configuration**
  - [ ] CORS whitelist by environment
  - [ ] Development: localhost only
  - [ ] Production: dive-drop.com domains only
  - [ ] Preflight requests handled correctly
  - [ ] Test: Request from unauthorized origin → 403

- [ ] **Origin Validation**
  - [ ] Origin header checked on all requests
  - [ ] Referer header validated
  - [ ] Content-Type validated (must be JSON)
  - [ ] Test: Curl with bad origin → should fail

### 3.3 Security Headers

- [ ] **Standard Headers**
  - [ ] Strict-Transport-Security: Force HTTPS
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY (prevent clickjacking)
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Test: Check headers with curl or DevTools

- [ ] **Content Security Policy (CSP)**
  - [ ] CSP header configured
  - [ ] script-src limited to 'self' for admin
  - [ ] style-src allows TailwindCSS
  - [ ] img-src allows images
  - [ ] Test: CSP violations logged to endpoint

- [ ] **Additional Headers**
  - [ ] Referrer-Policy: strict-origin-when-cross-origin
  - [ ] Permissions-Policy: geolocation=(), microphone=()
  - [ ] Cross-Origin-Opener-Policy: same-origin
  - [ ] Cross-Origin-Embedder-Policy: require-corp

---

## Part 4: Rate Limiting & Abuse Prevention

### 4.1 Rate Limiting

- [ ] **Login Rate Limiting**
  - [ ] Max 5 login attempts per 5 minutes
  - [ ] 15-minute lockout after 5 failures
  - [ ] Rate limit tracked by IP + username
  - [ ] Test: Attempt 6 logins → account locked

- [ ] **API Rate Limiting**
  - [ ] General API: 100 requests per minute
  - [ ] Auth endpoints: 10 requests per minute
  - [ ] Admin endpoints: 50 requests per minute
  - [ ] Proper error response (429 Too Many Requests)
  - [ ] Test: Exceed limit → 429 response

- [ ] **Rate Limit Implementation**
  - [ ] Redis or database backed (not in-memory)
  - [ ] Survives server restart
  - [ ] Distributed rate limiting (multi-instance)
  - [ ] Sliding window or fixed window
  - [ ] Test: Distribute requests across servers → limits respected

### 4.2 Abuse Prevention

- [ ] **Account Lockout**
  - [ ] Account locked after 5 failed logins
  - [ ] Manual unlock by support or auto-unlock after delay
  - [ ] User notified of lockout
  - [ ] Test: 5 failed attempts → lockout message

- [ ] **Blocking System**
  - [ ] Users can block abusive users
  - [ ] Blocked users' listings hidden
  - [ ] Blocked users cannot contact
  - [ ] Block reason stored for moderation
  - [ ] Test: Block user → cannot see their listings

- [ ] **Reporting System**
  - [ ] Users can report abuse
  - [ ] Reports stored with full context
  - [ ] Admin can review reports
  - [ ] Reported users flagged for moderation
  - [ ] Test: Submit report → appears in admin queue

---

## Part 5: Privacy & Data Protection

### 5.1 Contact Privacy

- [ ] **Contact Reveal Workflow**
  - [ ] Contact info hidden by default
  - [ ] User must request contact reveal
  - [ ] Owner must accept request
  - [ ] Both users confirm mutual reveal
  - [ ] Test: Contact only visible after mutual accept

- [ ] **Contact Info Protection**
  - [ ] Email & phone encrypted in database
  - [ ] Only revealed to agreed parties
  - [ ] Revealed contact logged in audit_log
  - [ ] Contact can be "un-revealed"
  - [ ] Test: Reveal then block → contact hidden again

### 5.2 Data Minimization

- [ ] **Collect Only Needed Data**
  - [ ] Email: required for login
  - [ ] Name: required for profile
  - [ ] Location: required for buddy search
  - [ ] Phone: optional, user-provided
  - [ ] No tracking data collected unnecessarily

- [ ] **Data Retention**
  - [ ] User data kept until account deletion
  - [ ] Deleted accounts: data purged within 30 days
  - [ ] Audit logs kept for 1 year
  - [ ] Backups of deleted data destroyed
  - [ ] Test: Delete account → verify data removal

### 5.3 GDPR/CCPA Compliance

- [ ] **User Rights**
  - [ ] Right to access data (export)
  - [ ] Right to delete (account deletion)
  - [ ] Right to correction (profile update)
  - [ ] Right to portability (JSON export)
  - [ ] Test: Export user data as JSON

- [ ] **Privacy Policy**
  - [ ] Clear privacy policy in Hebrew and English
  - [ ] Explains data usage
  - [ ] Explains third-party sharing
  - [ ] Explains contact reveal flow
  - [ ] Dated and versioned

- [ ] **Terms of Service**
  - [ ] Clear terms of service
  - [ ] Explains user obligations
  - [ ] Explains prohibited conduct
  - [ ] Explains consequences of violations
  - [ ] Dated and versioned

---

## Part 6: Audit & Compliance

### 6.1 Audit Logging

- [ ] **Action Logging**
  - [ ] All sensitive actions logged
  - [ ] Listing created/deleted logged
  - [ ] Contact revealed logged
  - [ ] User blocked/reported logged
  - [ ] Admin actions logged with user info

- [ ] **Log Content**
  - [ ] Timestamp (UTC)
  - [ ] User ID
  - [ ] Action type
  - [ ] Resource ID
  - [ ] Changes (JSON)
  - [ ] IP address / User-Agent

- [ ] **Log Security**
  - [ ] Logs immutable (append-only)
  - [ ] Logs not directly queryable by users
  - [ ] Logs encrypted in transit
  - [ ] Logs retained for 1 year
  - [ ] Access to logs restricted to security team

- [ ] **Log Auditing**
  - [ ] Admins can view logs (limited to 1 year)
  - [ ] Export logs for compliance audits
  - [ ] Search logs by user/date/action
  - [ ] Test: Find contact reveal event in logs

### 6.2 Error Handling

- [ ] **Safe Error Messages**
  - [ ] Generic error messages to users
  - [ ] "Listing not found" instead of "ID 123 doesn't exist"
  - [ ] "You don't have permission" not "RLS policy denied"
  - [ ] No database/system details leaked
  - [ ] Test: Trigger errors → check messages

- [ ] **Error Logging**
  - [ ] All errors logged server-side
  - [ ] Error logs include stack trace
  - [ ] Errors sent to monitoring (Sentry, etc.)
  - [ ] Errors do not contain PII
  - [ ] Test: Error appears in monitoring

---

## Part 7: Third-Party & Dependencies

### 7.1 Dependency Security

- [ ] **Dependency Inventory**
  - [ ] npm audit run with 0 vulnerabilities
  - [ ] No critical vulnerabilities
  - [ ] All dependencies pinned to versions
  - [ ] Lockfile committed to Git
  - [ ] Test: npm audit --production

- [ ] **Dependency Updates**
  - [ ] Automated dependency scanning (Dependabot)
  - [ ] Updates tested before merge
  - [ ] Major versions reviewed for breaking changes
  - [ ] Security updates applied within 24 hours

### 7.2 Third-Party Services

- [ ] **Supabase**
  - [ ] RLS policies secure
  - [ ] Database password strong
  - [ ] Service role key never exposed
  - [ ] IP whitelist configured (optional)

- [ ] **Anthropic API**
  - [ ] API key stored in environment variables
  - [ ] Rate limits configured
  - [ ] Request logging enabled
  - [ ] No PII sent to API

- [ ] **Resend Email**
  - [ ] API key secured
  - [ ] Email templates reviewed for XSS
  - [ ] Unsubscribe link included
  - [ ] Email authentication (DKIM/SPF) configured

---

## Part 8: Deployment & Infrastructure

### 8.1 Environment Configuration

- [ ] **Environment Variables**
  - [ ] Secrets stored in Vercel secrets
  - [ ] No .env files committed
  - [ ] Environment variables documented
  - [ ] Staging & production separated
  - [ ] Test: Verify each environment uses correct config

- [ ] **Secrets Management**
  - [ ] Database passwords never in code
  - [ ] API keys never in code
  - [ ] JWT signing keys rotated
  - [ ] Service role keys protected
  - [ ] Secrets rotation scheduled

### 8.2 Deployment Security

- [ ] **CI/CD Pipeline**
  - [ ] Automated tests run on every commit
  - [ ] Security scan runs on every commit
  - [ ] Code review required before merge
  - [ ] Deployment requires approval
  - [ ] Deployment logged with approver

- [ ] **Production Deployment**
  - [ ] Staging environment mirrors production
  - [ ] All tests pass before production
  - [ ] Database migrations tested in staging
  - [ ] Rollback procedure documented
  - [ ] Post-deployment smoke tests

### 8.3 Infrastructure Security

- [ ] **Vercel Configuration**
  - [ ] Automatic HTTPS
  - [ ] DDoS protection
  - [ ] WAF enabled (optional)
  - [ ] Geo-blocking configured (optional)

- [ ] **Database (Supabase)**
  - [ ] Automatic backups
  - [ ] Connection pooling enabled
  - [ ] SSL enforcement
  - [ ] IP whitelist (if needed)

---

## Part 9: Incident Response

### 9.1 Incident Response Plan

- [ ] **Response Process**
  - [ ] Incident severity levels defined
  - [ ] Escalation path documented
  - [ ] On-call rotation established
  - [ ] Communication plan defined

- [ ] **Detection & Monitoring**
  - [ ] Error monitoring active (Sentry)
  - [ ] Performance monitoring active
  - [ ] Security monitoring active
  - [ ] Alerts configured with thresholds
  - [ ] Team notified on critical alerts

- [ ] **Incident Response**
  - [ ] Incident declared within 15 min
  - [ ] Team assembled
  - [ ] Fix implemented
  - [ ] Staging tested
  - [ ] Production deployed
  - [ ] Users notified
  - [ ] Postmortem within 48 hours

### 9.2 Security Incident Response

- [ ] **Data Breach Response**
  - [ ] Plan to notify users within 72 hours
  - [ ] Contact legal immediately
  - [ ] Preserve forensic evidence
  - [ ] Determine scope of breach
  - [ ] Document mitigation steps

---

## Part 10: Testing & Validation

### 10.1 Security Testing

- [ ] **Authentication Testing**
  - [ ] Test login flow
  - [ ] Test logout flow
  - [ ] Test session expiration
  - [ ] Test token refresh
  - [ ] Test password reset
  - [ ] Test email verification

- [ ] **Authorization Testing**
  - [ ] Anonymous user cannot create listing
  - [ ] User cannot delete others' listings
  - [ ] Non-owner cannot see contact until reveal
  - [ ] Admin can access admin panel
  - [ ] Blocked user cannot contact
  - [ ] Test all permission matrix combinations

- [ ] **Injection Testing**
  - [ ] Test XSS payloads
  - [ ] Test SQL injection
  - [ ] Test command injection
  - [ ] Test LDAP injection
  - [ ] Test template injection

- [ ] **OWASP Top 10 Coverage**
  - [ ] A01: Broken Access Control
  - [ ] A02: Cryptographic Failures
  - [ ] A03: Injection
  - [ ] A04: Insecure Design
  - [ ] A05: Security Misconfiguration
  - [ ] A06: Vulnerable Components
  - [ ] A07: Authentication Failures
  - [ ] A08: Data Integrity Failures
  - [ ] A09: Logging/Monitoring Failures
  - [ ] A10: SSRF

### 10.2 Performance & Reliability

- [ ] **Load Testing**
  - [ ] Tested with 100 concurrent users
  - [ ] Response times acceptable
  - [ ] Database doesn't hit limits
  - [ ] No memory leaks

- [ ] **Disaster Recovery**
  - [ ] Backup restore tested
  - [ ] RTO (Recovery Time) documented
  - [ ] RPO (Recovery Point) documented
  - [ ] Rollback tested and working

---

## Part 11: Compliance Checklist

### 11.1 Standards & Frameworks

- [ ] **OWASP Compliance**
  - [ ] Top 10 risks mitigated
  - [ ] Security testing completed
  - [ ] Code review for security

- [ ] **SOC 2 Type II Readiness**
  - [ ] Access control implemented
  - [ ] Audit logging implemented
  - [ ] Data protection implemented
  - [ ] Incident monitoring in place

- [ ] **GDPR Compliance**
  - [ ] Data minimization
  - [ ] User consent obtained
  - [ ] Right to access enabled
  - [ ] Right to delete enabled
  - [ ] Data breach notification plan
  - [ ] Privacy policy compliant

- [ ] **CCPA Compliance**
  - [ ] Opt-out capability
  - [ ] Data transparency
  - [ ] Right to delete
  - [ ] Right to know

### 11.2 Documentation

- [ ] **Security Documentation**
  - [ ] SECURITY_CHECKLIST.md complete (this file)
  - [ ] ARCHITECTURE.md security section complete
  - [ ] Security module guides in SECURITY_MODULES/
  - [ ] Incident response plan documented
  - [ ] Data retention policy documented

---

## Pre-Launch Signoff

### Security Team Review

| Item | Status | Reviewer | Date |
|------|--------|----------|------|
| Part 1: Authentication | ☐ PASS | | |
| Part 2: Data Protection | ☐ PASS | | |
| Part 3: Network Security | ☐ PASS | | |
| Part 4: Rate Limiting | ☐ PASS | | |
| Part 5: Privacy | ☐ PASS | | |
| Part 6: Audit & Logging | ☐ PASS | | |
| Part 7: Dependencies | ☐ PASS | | |
| Part 8: Deployment | ☐ PASS | | |
| Part 9: Incident Response | ☐ PASS | | |
| Part 10: Testing | ☐ PASS | | |
| Part 11: Compliance | ☐ PASS | | |

### Required Approvals

- [ ] **Security Lead Sign-Off**
  - Name: _________________
  - Date: _________________
  - Comments: _________________

- [ ] **Tech Lead Sign-Off**
  - Name: _________________
  - Date: _________________
  - Comments: _________________

- [ ] **DevOps Lead Sign-Off**
  - Name: _________________
  - Date: _________________
  - Comments: _________________

### Known Issues & Remediation Plan

Document any findings here:

```
Issue 1: [Description]
Severity: [Critical/High/Medium/Low]
Status: [Open/In Progress/Resolved]
Remediation: [Action plan]
Timeline: [When will be fixed]
Owner: [Who is responsible]
```

---

## Post-Launch

### First 24 Hours

- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Monitor security alerts
- [ ] Test critical workflows manually
- [ ] No deployments unless critical fix

### First Week

- [ ] Run security audit tools
- [ ] Dependency scanning
- [ ] Penetration testing (optional)
- [ ] User feedback review
- [ ] Performance optimization

### Monthly

- [ ] Security team meeting
- [ ] Dependency updates review
- [ ] Audit log review
- [ ] Incident review (if any)
- [ ] Compliance check

---

## Quick Reference

### Common Test Scenarios

**Anonymous User Test:**
1. Visit site without logging in
2. View public listings ✅
3. Try to create listing ❌
4. Try to express interest ❌
5. Try to access admin ❌

**Registered User Test:**
1. Log in with valid credentials ✅
2. Create listing ✅
3. Express interest in another's listing ✅
4. Request contact reveal ✅
5. Block user ✅
6. Report abuse ✅
7. Try to delete another's listing ❌
8. Try to access admin ❌

**Authorization Test:**
1. Try SQL injection in search ❌
2. Try XSS in comments ❌
3. Try to escalate to admin ❌
4. Try to see others' email before reveal ❌
5. Try to bypass CORS ❌

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Document Status:** Production-Ready  
**Last Review:** June 20, 2026  
**Next Review:** Before each production release  
**Maintained By:** Security Team
