# Summary

<!-- What does this change and why? -->

## Testing checklist

- [ ] `make ci-local` passes locally
- [ ] New behaviour has tests (query by role/label, not implementation details)
- [ ] The four async states are handled where applicable (loading / empty / error / success)
- [ ] No hardcoded colours or arbitrary pixel values in components
- [ ] Accessibility checked (keyboard, focus, ARIA); axe-clean
- [ ] No `TODO`/placeholder in the diff
