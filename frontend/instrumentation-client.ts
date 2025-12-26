import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // or 'always' to track all users
    capture_pageview: false, // we'll manually capture pageviews
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
      },
      maskInputFn: (text, element) => {
        // Don't mask inputs with inputMode="url" (our search bar)
        if (element?.getAttribute('inputmode') === 'url') {
          return text;
        }
        return '*'.repeat(text.length);
      },
    },
  })
}

export { posthog }
