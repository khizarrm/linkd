# Plan: Fix www Subdomain Issue in Email Generation

## Problem
Emails are being generated with "www." prefix (e.g., `first.last@www.whatever.com`) instead of the base domain (e.g., `first.last@whatever.com`).

## Solution
Strip "www." and other common subdomains in `getEmailDomain()` function before email generation, while preserving full domain for web scraping.

## Implementation Checklist

[x] Step 1: Create helper function `stripSubdomain()` in `worker/src/tools/emailFinder.ts` - Add function that removes "www." prefix and other common subdomains (mail., blog., app.) from domain string, returns cleaned domain

[x] Step 2: Modify `getEmailDomain()` function in `worker/src/tools/emailFinder.ts` - Apply `stripSubdomain()` to `websiteDomain` parameter before adding to domains array, ensure scrapedEmail domain handling remains unchanged

[x] Step 3: Verify web scraping still works with full domain - Check that `scrapeEmailPattern(domain)` on line 131 still receives full domain with www prefix, confirm scraping logic unchanged

[x] Step 4: Test email generation with www domain - Run email finder with domain "www.example.com", verify generated emails use "example.com" not "www.example.com" in email addresses

[x] Step 5: Test email generation with non-www domain - Run email finder with domain "example.com", verify generated emails still use "example.com" correctly

[x] Step 6: Test edge cases - Verify handling of domains like "www2.example.com", "mail.example.com", "blog.example.com" - ensure only common subdomains are stripped, not legitimate subdomains
