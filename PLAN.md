# Implementation Plan: Linkd Frontend Updates

## Sidebar Changes

- [x] Step 1: Add "Guide" item to sidebar items array in `app-sidebar.tsx` - Add object with title "Guide", url `https://www.youtube.com/watch?v=ZbaHpPGghzk`, and appropriate icon (e.g., PlayCircle or Video from lucide-react) - Verification: Check items array contains new Guide entry
- [x] Step 2: Import icon for Guide nav item in `app-sidebar.tsx` - Add PlayCircle or Video icon import from lucide-react - Verification: Icon import exists at top of file
- [x] Step 3: Create feedback dialog component `feedback-dialog.tsx` in `components/` directory - Create new file with Dialog component, textarea input, and submit button - Verification: File exists with basic dialog structure
- [x] Step 4: Add feedback dialog state management in `app-sidebar.tsx` - Add useState hook for dialog open/close state - Verification: State variable declared and initialized
- [x] Step 5: Add "Feedback" button in sidebar footer in `app-sidebar.tsx` - Add SidebarMenuItem with SidebarMenuButton that opens feedback dialog - Verification: Feedback button visible in sidebar footer
- [x] Step 6: Import and render FeedbackDialog component in `app-sidebar.tsx` - Import FeedbackDialog and add it below SidebarFooter with open/onOpenChange props - Verification: Dialog component rendered in sidebar

## Search Input Changes

- [x] Step 7: Remove rotating placeholder logic from `search-form.tsx` - Remove PLACEHOLDER_TEXTS array, placeholderIndex state, intervalRef, and useEffect for rotation - Verification: No placeholder rotation code remains
- [x] Step 8: Replace placeholder with static text in `search-form.tsx` - Add placeholder prop to input element with value "Type in a company name here." - Verification: Input has static placeholder attribute
- [x] Step 9: Remove slot machine animation div from `search-form.tsx` - Remove the conditional div that renders rotating placeholder text - Verification: No slot-machine-container div in JSX

## Tagline Change

- [x] Step 10: Update tagline text in `search-header.tsx` - Change "link up ting" to "reach decision makers directly" in the paragraph element - Verification: Tagline displays new text

## Tips Section

- [x] Step 11: Create tips section component `search-tips.tsx` in `components/search/` directory - Create component with three tip items in list format matching design system - Verification: Component file exists with three tips rendered
- [x] Step 12: Import SearchTips component in `page.tsx` - Add import statement for SearchTips component - Verification: Import statement exists
- [x] Step 13: Render SearchTips component below SearchResults in `page.tsx` - Add SearchTips component after SearchResults with appropriate spacing - Verification: Tips section appears below search results on page

## Verification Checklist

- [ ] Step 14: Verify Guide nav item appears in sidebar - Check sidebar shows "Guide" below "Search" with correct icon - Verification: Guide item visible and clickable in sidebar
- [ ] Step 15: Verify feedback modal opens and closes - Click Feedback button, verify modal opens with textarea, submit works, modal closes - Verification: Modal interaction works correctly
- [ ] Step 16: Verify static placeholder displays - Check search input shows "Type in a company name here." when empty - Verification: Static placeholder text visible
- [ ] Step 17: Verify tagline updated - Check search page header shows "reach decision makers directly" - Verification: New tagline displays correctly
- [ ] Step 18: Verify tips section displays - Check tips appear below search results with all three tips visible - Verification: Tips section renders with correct content
- [ ] Step 19: Test responsive design - Check all changes work on mobile, tablet, and desktop breakpoints - Verification: Layout responsive at all breakpoints
