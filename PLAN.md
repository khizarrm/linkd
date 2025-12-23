# PLAN: Login Page UI Redesign

## Goal
Redesign login page to match screenshot: minimal black background, Fira Mono font, centered "linkd" branding with input bar in top half, 3-column question cards in bottom half. Luxurious micro-interactions with smooth animations.

---

## Checklist

### Phase 1: Font Setup

- [x] Step 1: Add Fira Mono font to `frontend/src/app/layout.tsx` using `next/font/google` - **Verify**: Font variable `--font-fira-mono` appears in body class
- [x] Step 2: Add `--font-fira` CSS variable to `frontend/src/app/globals.css` theme config - **Verify**: Variable accessible in Tailwind classes

### Phase 2: Login Page Structure

- [x] Step 3: Remove all existing content from `frontend/src/app/login/page.tsx` (keep imports, hooks, redirect logic, demo search logic with 3-try limit) - **Verify**: Page renders blank black background
- [x] Step 4: Create top section with centered "linkd" title using Fira Mono - **Verify**: Title visible, centered horizontally
- [x] Step 5: Add subtitle "an easier way to outreach" below title - **Verify**: Subtitle visible, muted color, centered
- [x] Step 6: Add input bar with placeholder "Type a company website here" (connects to existing demo search logic) - **Verify**: Input visible, white border, centered below subtitle, search works with 3-try limit
- [x] Step 7: Add "Get Started" / "Create Account" button below input bar that triggers Clerk sign-in - **Verify**: Button visible, clicking opens Clerk auth modal/flow

### Phase 3: Question Cards Section

- [x] Step 8: Create 3-column grid container below input section - **Verify**: Grid renders with 3 equal columns
- [x] Step 9: Create reusable `QuestionCard` component with title and bullet list - **Verify**: Component renders card with border
- [x] Step 10: Add left column card "Whats linkd?" with filler bullet points - **Verify**: Card visible in left column
- [x] Step 11: Add center column card (filler question) with filler bullet points - **Verify**: Card visible in center column
- [x] Step 12: Add right column card (filler question) with filler bullet points - **Verify**: Card visible in right column

### Phase 4: Micro-Interactions & Animations (Luxury Feel)

- [x] Step 13: Add smooth cursor/caret animation to input field (CSS `caret-color` + custom cursor styling, no jitter) - **Verify**: Typing feels smooth, cursor doesn't jump
- [x] Step 14: Add subtle hover lift effect on cards (transform: translateY + box-shadow transition, 200-300ms ease-out) - **Verify**: Cards lift slightly on hover with shadow
- [x] Step 15: Add gentle bounce animation for results appearing (CSS spring/bounce keyframes) - **Verify**: Results bounce in smoothly
- [x] Step 16: Add hover scale effect on buttons (1.02x scale, smooth transition) - **Verify**: Buttons feel responsive on hover
- [x] Step 17: Add staggered fade-in for cards on page load (animation-delay per card) - **Verify**: Cards animate in sequence
- [x] Step 18: Ensure all transitions use `cubic-bezier` easing for luxury feel (no linear) - **Verify**: All animations feel smooth, not robotic

### Phase 5: Results Display (Minimal & Copyable)

- [x] Step 19: Design minimal results card showing person name, role, email - **Verify**: Results display cleanly
- [x] Step 20: Add copy button with smooth feedback animation (checkmark bounce) - **Verify**: Clicking copy shows success animation
- [x] Step 21: Add subtle entrance animation for results (slide up + fade) - **Verify**: Results appear smoothly after search
- [x] Step 22: Style "Try another" button with hover effects - **Verify**: Button matches luxury feel

### Phase 6: Styling & Polish

- [x] Step 23: Apply consistent Fira Mono font to all text elements - **Verify**: All text uses monospace font
- [x] Step 24: Set card borders to subtle white/gray with hover glow effect - **Verify**: Cards have visible borders, glow on hover
- [x] Step 25: Ensure responsive layout (stack cards on mobile, maintain smooth animations) - **Verify**: Cards stack vertically on narrow viewport, animations still smooth
- [x] Step 26: Remove grain overlay for clean minimal look - **Verify**: No visual noise on page
- [x] Step 27: Add GPU acceleration hints (`will-change`, `transform: translateZ(0)`) for smooth 60fps animations - **Verify**: No jank during animations

### Phase 7: Performance & Polish

- [x] Step 28: Test on mobile - ensure touch interactions feel responsive - **Verify**: Taps feel instant, no delay
- [x] Step 29: Add `prefers-reduced-motion` fallbacks for accessibility - **Verify**: Animations disabled for users who prefer reduced motion
- [x] Step 30: Final visual QA - spacing, alignment, color consistency - **Verify**: Page looks polished and intentional

---

## Animation Specs
- **Hover lift**: `transform: translateY(-2px)`, `box-shadow` increase, `200ms cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Bounce in**: `@keyframes bounceIn` with scale overshoot (1.0 → 1.05 → 1.0)
- **Fade in**: `opacity: 0 → 1`, `translateY: 10px → 0`, `400ms ease-out`
- **Button hover**: `scale(1.02)`, `150ms ease-out`
- **Stagger delay**: 50-100ms between cards

## Notes
- Fira Mono from Google Fonts: `Fira_Mono`
- Keep demo search logic with 3-try limit (localStorage tracking)
- Clerk auth triggered by button, not embedded SignIn component
- All animations GPU-accelerated for smooth 60fps
- Mobile-first responsive design
