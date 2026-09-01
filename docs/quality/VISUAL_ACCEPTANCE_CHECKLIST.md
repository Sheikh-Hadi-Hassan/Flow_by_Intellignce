# Visual Acceptance Checklist

Use before claiming visual PASS on any screen or phase.

## Per-screen checks

- [ ] Meaningful visual hierarchy (not flat bullet list)
- [ ] User-readable labels (no snake_case enums)
- [ ] Responsive at 320, 375, 430, 768, 1440px
- [ ] Light mode verified
- [ ] Dark mode verified
- [ ] Custom accent verified
- [ ] Loading state present and styled
- [ ] Empty state present and helpful (not blank)
- [ ] Error state present and actionable
- [ ] No horizontal overflow
- [ ] No text collisions
- [ ] Keyboard navigable primary actions
- [ ] Focus indicators visible
- [ ] Disabled controls explained
- [ ] Real data or intentional demo data (not lorem ipsum)
- [ ] Screenshots captured as evidence

## Reject as complete

- Raw client/opportunity creation forms on list pages
- Team presented as bullet list
- Placeholder Reports page
- Empty My Work in investor journey
- Exposed internal status enums
- Fake metrics or decorative charts without data
- Static instructional Ask Flow without Proof
- Weak Mission Control visualization
- Excessive whitespace
- Generic CRUD without product hierarchy

## Scoring

Independent UI critic scores 0–10 per primary screen.
**Visual PASS requires ≥ 8/10 average on primary journey screens.**

## Product-owner approval

Visual PASS additionally requires explicit product-owner approval recorded in the evidence manifest. Agent self-approval is not sufficient.

## Known current defects (not accepted baselines)

These are documented failures, not approved design:

1. Raw client creation form on clients page
2. Raw opportunity creation form on pipeline
3. Team list as raw bullets
4. Internal enum values shown to users
5. Empty My Work state
6. Placeholder Reports content
7. Weak Mission Control data visualization
8. Excessive whitespace on several admin pages
9. Static Ask Flow instructional content
10. Component quality below premium product standard
