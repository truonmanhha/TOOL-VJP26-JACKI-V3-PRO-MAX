# Audit Website Skill - SEO & Performance Analysis

## Description
Audit websites for SEO, technical issues, content quality, performance, and security using comprehensive analysis tools. Essential for ensuring nesting tool meets web standards.

## When to Use

Use this skill when you need to:
- Analyze website health và performance
- Debug technical SEO issues
- Check for broken links
- Validate meta tags và structured data
- Generate site audit reports
- Improve accessibility và security
- Compare site health before/after changes

## Key Audit Categories

### 1. SEO Issues (CRITICAL)
- Meta tags, titles, descriptions
- Canonical URLs
- Open Graph tags
- Heading structure (H1-H6)
- Schema.org markup

### 2. Technical Problems (HIGH)
- Broken links (internal & external)
- Redirect chains
- Page speed
- Mobile-friendliness
- URL structure

### 3. Performance (HIGH)
- Page load time
- Resource usage
- Caching configuration
- Image optimization
- Bundle size

### 4. Content Quality (MEDIUM)
- Image alt text
- Content analysis
- Keyword optimization
- Duplicate content
- Content structure

### 5. Security (CRITICAL)
- HTTPS usage
- Security headers
- Mixed content
- Leaked secrets
- Content Security Policy

### 6. Accessibility (CRITICAL)
- Alt text for images
- Color contrast
- Keyboard navigation
- ARIA labels
- Form labels
- Focus management

### 7. User Experience (HIGH)
- User flow
- Form validation
- Error handling
- Touch targets
- Responsive design

## Manual Audit Checklist

### SEO Audit
```typescript
// Checklist cho Nesting Tool
interface SEOAudit {
  // Meta tags
  title: string;              // Unique, 50-60 chars
  description: string;        // 150-160 chars
  canonical: string;          // Correct canonical URL
  robots: string;             // index, follow
  
  // Open Graph
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  
  // Structured Data
  schemaOrg: object;          // JSON-LD structured data
  
  // Headings
  h1: string;                 // One per page
  h2: string[];               // Logical hierarchy
  h3: string[];
}
```

### Performance Audit
```typescript
interface PerformanceAudit {
  // Core Web Vitals
  lcp: number;                // Largest Contentful Paint < 2.5s
  fid: number;                // First Input Delay < 100ms
  cls: number;                // Cumulative Layout Shift < 0.1
  
  // Loading metrics
  fcp: number;                // First Contentful Paint
  tti: number;                // Time to Interactive
  tbt: number;                // Total Blocking Time
  
  // Resource optimization
  imageOptimization: boolean;
  lazyLoading: boolean;
  codeSplitting: boolean;
  cachingEnabled: boolean;
}
```

### Accessibility Audit
```typescript
interface AccessibilityAudit {
  // Visual
  colorContrast: boolean;     // WCAG AA 4.5:1 minimum
  textResize: boolean;        // 200% without horizontal scroll
  
  // Navigation
  keyboardNavigation: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  
  // Content
  altText: boolean;           // All images have alt
  formLabels: boolean;        // All inputs have labels
  ariaLabels: boolean;        // Icon buttons labeled
  
  // Structure
  semanticHtml: boolean;      // Proper heading hierarchy
  landmarkRegions: boolean;   // nav, main, aside, etc.
}
```

## Implementation Guidelines

### HTML Head Setup
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <!-- Basic Meta -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VJP26 Nesting Tool - CNC Nesting Solution</title>
  <meta name="description" content="Professional CNC nesting tool for DXF files. Optimize material usage with genetic algorithms. Generate GCode for your CNC machine.">
  
  <!-- Canonical -->
  <link rel="canonical" href="https://yourdomain.com">
  
  <!-- Robots -->
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:title" content="VJP26 Nesting Tool">
  <meta property="og:description" content="Professional CNC nesting solution">
  <meta property="og:image" content="/og-image.jpg">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://yourdomain.com">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="VJP26 Nesting Tool">
  <meta name="twitter:description" content="Professional CNC nesting solution">
  <meta name="twitter:image" content="/og-image.jpg">
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#0f172a">
</head>
```

### Performance Optimization
```typescript
// Lazy loading components
const DXFViewer = lazy(() => import('./components/DXFViewer'));
const GCodePreview = lazy(() => import('./components/GCodePreview'));

// Image optimization
<img
  src="preview-400.webp"
  srcSet="preview-400.webp 400w, preview-800.webp 800w"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="Nesting preview"
  loading="lazy"
  decoding="async"
/>

// Code splitting by route
const NestingTool = lazy(() => import('./pages/NestingTool'));
const Settings = lazy(() => import('./pages/Settings'));

// Preload critical resources
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/critical.css" as="style">
```

### Accessibility Implementation
```typescript
// Proper form labels
<label htmlFor="sheet-width">Chiều rộng tấm (mm)</label>
<input
  id="sheet-width"
  type="number"
  aria-describedby="width-help"
  aria-required="true"
/>
<span id="width-help">Nhập từ 100-3000mm</span>

// Icon buttons with aria-label
<button
  aria-label="Xóa chi tiết"
  onClick={handleDelete}
>
  <Trash2 size={18} />
</button>

// Focus management
const buttonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  if (isOpen) {
    buttonRef.current?.focus();
  }
}, [isOpen]);

// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Tab') {
      trapFocus(e);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Security Headers
```typescript
// vite.config.ts - Security headers
export default defineConfig({
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' http://localhost:8000",
      ].join('; '),
    },
  },
});
```

## Audit Checklist

### Before Deployment
- [ ] All pages have unique titles (50-60 chars)
- [ ] All pages have meta descriptions (150-160 chars)
- [ ] Canonical URLs are correct
- [ ] Open Graph tags present
- [ ] Favicon and touch icons
- [ ] No broken links
- [ ] HTTPS enabled
- [ ] Security headers configured

### Performance
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Images optimized (WebP)
- [ ] Lazy loading implemented
- [ ] Code splitting enabled
- [ ] Bundle size < 500KB (gzipped)

### Accessibility
- [ ] WCAG AA compliance
- [ ] Color contrast 4.5:1
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA labels for icons
- [ ] Semantic HTML structure

### SEO
- [ ] XML sitemap
- [ ] Robots.txt
- [ ] Structured data (JSON-LD)
- [ ] Heading hierarchy (H1 > H2 > H3)
- [ ] Internal linking
- [ ] Mobile-friendly

## Testing Tools

### Browser DevTools
```bash
# Lighthouse audit
# Open DevTools > Lighthouse > Run Audit

# Performance profiling
# DevTools > Performance > Record

# Accessibility inspection
# DevTools > Elements > Accessibility panel
```

### Online Tools
```bash
# PageSpeed Insights
https://pagespeed.web.dev/

# WebPageTest
https://www.webpagetest.org/

# GTmetrix
https://gtmetrix.com/

# WAVE Accessibility
https://wave.webaim.org/

# W3C Validator
https://validator.w3.org/
```

### CLI Tools
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# pa11y accessibility testing
npm install -g pa11y
pa11y https://localhost:5173

# Webhint
npm install -g hint
hint https://localhost:5173
```

## Common Issues & Fixes

### Issue: Low Lighthouse Score
```typescript
// Fix: Implement performance optimizations
// 1. Code splitting
// 2. Image optimization
// 3. Lazy loading
// 4. Caching strategies
```

### Issue: Accessibility Violations
```typescript
// Fix: Add missing ARIA labels
// 1. Audit with axe-core
// 2. Add alt text to images
// 3. Fix color contrast
// 4. Add form labels
```

### Issue: SEO Issues
```typescript
// Fix: Improve meta tags
// 1. Add unique titles
// 2. Add meta descriptions
// 3. Implement structured data
// 4. Create sitemap.xml
```

## Best Practices

1. **Regular Audits**: Run audits weekly during development
2. **Fix Critical First**: Prioritize CRITICAL and HIGH issues
3. **Test on Real Devices**: Don't rely solely on emulators
4. **Monitor Performance**: Track Core Web Vitals over time
5. **Document Changes**: Keep changelog of optimizations
6. **Automate Testing**: Integrate audits into CI/CD pipeline
