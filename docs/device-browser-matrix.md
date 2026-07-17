# Device and browser release matrix

The automated release gate exercises the customer access, navigation, sign-out, protected-resource, responsive-layout, and baseline accessibility journeys in Chromium, Firefox, WebKit, Pixel 7 Chrome, and iPhone 15 Safari emulation.

Before a domain or major navigation change, repeat the smoke journey on physical devices. Record the date, operating system, browser version, tester, and result in the table below.

| Device | Browser | Priority | Required checks |
| --- | --- | --- | --- |
| Current iPhone | Safari | P0 | Password, brand navigation, section navigation, PDF opening, sign-out, portrait/landscape |
| Current Android phone | Chrome | P0 | Password, touch targets, brand navigation, PDF opening, sign-out |
| Windows laptop | Chrome and Edge | P0 | Full customer journey, downloads, keyboard navigation, 100% and 200% zoom |
| macOS laptop | Safari and Chrome | P0 | Full customer journey, downloads, keyboard navigation |
| iPad or similar tablet | Safari | P1 | Header wrapping, section navigation, PDF opening, rotation |
| Windows laptop | Firefox | P1 | Full customer journey and downloads |

## Pass criteria

- No horizontal page scrolling at 320 CSS pixels or wider.
- Every interactive control is visible, keyboard reachable, and has a clear focus state.
- Customer and section navigation identify the current destination.
- External catalogs open in a new tab; protected managed files open only after customer access.
- Expired sessions return to access and preserve the requested page.
- Empty, scheduled, unavailable, and outage states explain what happened without exposing internal errors.
- Footer actions remain usable above mobile safe-area insets.

Automated checks are necessary but do not replace this physical-device pass. Browser emulation does not reproduce native PDF viewers, browser chrome, password managers, or all safe-area behavior.
