# XSS Security Audit Report - Rabbit Hole Application

**Date**: November 23, 2025  
**Auditor**: Security Expert  
**Scope**: Backend resolvers and frontend components  
**Standard**: OWASP Top 10 A03:2021 - Injection (XSS)

## Executive Summary

**Total Vulnerabilities Found**: 7 Critical/High Severity Issues

The Rabbit Hole application has multiple critical XSS vulnerabilities that allow attackers to inject and execute malicious scripts. The primary issues stem from:
1. Unsafe use of `dangerouslySetInnerHTML` without sanitization
2. Direct rendering of user-generated content from JSONB props
3. Use of `eval()` for parsing frame rate data
4. Lack of input validation and output encoding

---

## Critical Vulnerabilities

### 1. **[CRITICAL] Unescaped HTML Rendering in Markdown Editor**
**File**: `/Users/kmk/rabbithole/frontend/src/components/forms/markdown-editor.tsx`  
**Line**: 110  
**Severity**: CRITICAL

```tsx
// Line 110: Direct HTML injection without sanitization
dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
```

**Attack Vector**: 
- User can inject arbitrary HTML/JavaScript through markdown content
- The custom `renderMarkdown()` function performs basic replacements but doesn't sanitize HTML

**Example Payload**:
```markdown
<img src=x onerror="alert('XSS')">
<script>fetch('/api/steal-cookies', {body: document.cookie})</script>
```

**Recommended Fix**:
```tsx
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before rendering
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(value)) }}
```

---

### 2. **[CRITICAL] Multiple Unsafe HTML Injections in EnrichedContent Component**
**File**: `/Users/kmk/rabbithole/frontend/src/components/content/enriched-content.tsx`  
**Lines**: 96, 107, 118, 168, 203  
**Severity**: CRITICAL

```tsx
// Multiple instances of unsafe HTML rendering
// Line 96
return <div dangerouslySetInnerHTML={{ __html: content }} />;

// Lines 107, 118, 168, 203
<span dangerouslySetInnerHTML={{ __html: beforeText }} />
<span dangerouslySetInnerHTML={{ __html: enrichedText }} />
```

**Attack Vector**:
- Content, citations, and node links are rendered directly as HTML
- No sanitization applied to user-controlled data

**Example Payload in Content**:
```javascript
{
  "content": "<script>alert('XSS')</script>",
  "citations": [{
    "text": "<img src=x onerror=alert('XSS')>",
    "url": "javascript:alert('XSS')"
  }]
}
```

**Recommended Fix**:
```tsx
import DOMPurify from 'isomorphic-dompurify';

// Sanitize all HTML content
return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />;
```

---

### 3. **[HIGH] eval() Usage in ContentAnalysisService**
**File**: `/Users/kmk/rabbithole/backend/src/services/ContentAnalysisService.ts`  
**Line**: 304  
**Severity**: HIGH

```typescript
// Line 304: Using eval to parse frame rate
fps: eval(videoStream.r_frame_rate || '0'), // e.g., "30/1" -> 30
```

**Attack Vector**:
- If attacker can control video metadata, they can inject arbitrary JavaScript
- eval() executes any JavaScript expression

**Example Payload**:
```javascript
// Malicious frame rate in video metadata
"r_frame_rate": "require('child_process').exec('rm -rf /')"
```

**Recommended Fix**:
```typescript
// Safe frame rate parsing without eval
fps: videoStream.r_frame_rate 
  ? videoStream.r_frame_rate.split('/').reduce((a, b) => Number(a) / Number(b))
  : 0,
```

---

### 4. **[HIGH] Unsanitized User Content in Activity Posts**
**File**: `/Users/kmk/rabbithole/frontend/src/components/collaboration/activity-post.tsx`  
**Line**: 99  
**Severity**: HIGH

```tsx
// Line 99: Direct rendering of user content
<p className="text-sm mb-2 whitespace-pre-wrap">{post.content}</p>
```

**Attack Vector**:
- While React escapes content by default, the content comes from JSONB props which could contain HTML
- If backend returns HTML-encoded content, it would be rendered

**Verification Needed**:
- Check if `post.content` can contain HTML from backend
- Check if any GraphQL resolver returns HTML in content fields

**Recommended Fix**:
```tsx
// Ensure plain text only
<p className="text-sm mb-2 whitespace-pre-wrap">
  {DOMPurify.sanitize(post.content, { ALLOWED_TAGS: [] })}
</p>
```

---

### 5. **[MEDIUM] Potential XSS in Chat Messages via Markdown**
**File**: `/Users/kmk/rabbithole/frontend/src/components/collaboration/chat-message.tsx`  
**Line**: 93-123  
**Severity**: MEDIUM

```tsx
// ReactMarkdown component without explicit sanitization
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {content}
</ReactMarkdown>
```

**Attack Vector**:
- ReactMarkdown can render HTML if not configured properly
- Custom link components could be exploited

**Example Payload**:
```markdown
[Click me](javascript:alert('XSS'))
<img src=x onerror=alert('XSS')>
```

**Recommended Fix**:
```tsx
import DOMPurify from 'isomorphic-dompurify';

// Sanitize before passing to ReactMarkdown
<ReactMarkdown 
  remarkPlugins={[remarkGfm]}
  skipHtml={true} // Skip HTML tags
  allowedElements={['p', 'a', 'code', 'pre', 'ul', 'ol', 'li']}
>
  {DOMPurify.sanitize(content)}
</ReactMarkdown>
```

---

### 6. **[MEDIUM] Backend Resolvers Return Unsanitized JSONB Props**
**Files**: All resolvers in `/Users/kmk/rabbithole/backend/src/resolvers/`  
**Severity**: MEDIUM

**Pattern Found**:
```typescript
// Common pattern in resolvers
const props = typeof row.props === 'string' ? JSON.parse(row.props) : row.props;
return { ...props };
```

**Attack Vector**:
- User-controlled data in JSONB props is returned directly to frontend
- No sanitization layer between database and GraphQL response

**Affected Resolvers**:
- CommentResolver (lines 48, 121)
- ChallengeResolver (lines 72, 110, 149)
- ActivityResolver (content field)
- All resolvers that return node/edge props

**Recommended Fix**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize text fields in props before returning
const sanitizeProps = (props: any) => {
  const sanitized = { ...props };
  ['content', 'description', 'title', 'text', 'message'].forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = DOMPurify.sanitize(sanitized[field], { 
        ALLOWED_TAGS: [] // Plain text only
      });
    }
  });
  return sanitized;
};

return sanitizeProps(props);
```

---

### 7. **[LOW] URL Parameter Injection Risk**
**Multiple Files**: Frontend components with href/src attributes  
**Severity**: LOW

**Pattern**:
```tsx
// Potential javascript: protocol injection
<a href={citation.url} />
<img src={userProvidedUrl} />
```

**Recommended Fix**:
```tsx
// Validate URLs before rendering
const sanitizeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '#';
    }
    return url;
  } catch {
    return '#';
  }
};
```

---

## Additional Security Concerns

### Missing Security Headers
The application lacks Content Security Policy (CSP) headers that could mitigate XSS attacks:

```javascript
// Recommended CSP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### Missing Input Validation
No comprehensive input validation found for:
- Node/edge props content
- Comment text
- Activity post content
- Challenge descriptions

---

## Summary Statistics

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Requires immediate fix |
| HIGH | 2 | Fix before production |
| MEDIUM | 2 | Fix in next release |
| LOW | 1 | Monitor and fix when possible |

**Total Vulnerabilities**: 7

---

## Remediation Priority

1. **Immediate Actions** (Critical):
   - Install and configure DOMPurify for all HTML rendering
   - Remove all unsafe uses of dangerouslySetInnerHTML
   - Replace eval() with safe parsing functions

2. **Short-term** (High):
   - Add input validation for all user-generated content
   - Implement output encoding in GraphQL resolvers
   - Add CSP headers

3. **Medium-term** (Medium/Low):
   - Audit all URL inputs for protocol validation
   - Implement centralized sanitization service
   - Add security linting rules (eslint-plugin-security)

---

## Testing Recommendations

1. **Automated Testing**:
   ```bash
   # Install security testing tools
   npm install --save-dev eslint-plugin-security
   npm audit
   ```

2. **Manual Testing Payloads**:
   ```javascript
   // Test these in all input fields
   const xssPayloads = [
     '<script>alert("XSS")</script>',
     '<img src=x onerror=alert("XSS")>',
     'javascript:alert("XSS")',
     '<svg onload=alert("XSS")>',
     '"><script>alert("XSS")</script>',
   ];
   ```

3. **Penetration Testing Tools**:
   - OWASP ZAP for automated scanning
   - Burp Suite for manual testing
   - XSSHunter for blind XSS detection

---

## Compliance Status

**OWASP Top 10 2021 - A03: Injection**
- ❌ **FAILED** - Multiple XSS vulnerabilities present
- Required: Input validation, output encoding, CSP headers
- Current: Minimal protections in place

**Recommended Security Framework**: 
- Implement OWASP XSS Prevention Cheat Sheet guidelines
- Follow React security best practices
- Use security-focused linting and CI/CD checks

---

## Conclusion

The Rabbit Hole application has significant XSS vulnerabilities that must be addressed before production deployment. The primary issue is the lack of sanitization for user-generated content, particularly when using `dangerouslySetInnerHTML` and rendering JSONB props data.

**Risk Level**: **CRITICAL** - Application is vulnerable to stored and reflected XSS attacks.

**Recommendation**: Do not deploy to production until all CRITICAL and HIGH severity issues are resolved.

---

*End of Security Audit Report*
