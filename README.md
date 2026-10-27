# Morning warm-up — Leaving Cert Higher Level maths

A fifteen-question warm-up you do once a morning, with a daily streak. Questions are
generated fresh from the date, so today's set is the same every time you open it and
tomorrow brings a new one.

It is an offline web app you add to your Android home screen. No build step, no
dependencies, no network after the first load, nothing leaves the phone.

There are three ways onto the phone, all the same app:

1. **Download the APK** from the [latest release](https://github.com/AlternativeLua/mathsprac/releases/latest)
   on the phone and tap it. Nothing else needed.
2. **Build the APK yourself** with `npm run apk`.
3. **Add the web app to the home screen** over Wi-Fi, as below.

## Getting it onto your phone over Wi-Fi

Both devices need to be on the same Wi-Fi.

```bash
node tools/serve.mjs
```

The server prints a `network:` address, something like `http://192.168.1.12:5173`.
Open that in Chrome on your phone, then **⋮ → Add to Home screen**. It installs as a
standalone app: own icon, own window, no browser chrome.

After that first visit the service worker has cached everything, so it opens and
works with the laptop off and the phone in airplane mode.

To update it later, run the server again and open the app once while on Wi-Fi. Bump
`VERSION` in `sw.js` whenever shell files change, otherwise the old cache is served.

## Building the APK

The app is also wrapped with [Capacitor](https://capacitorjs.com) into a real
installable Android package. The web app is the source of truth; the APK just
carries it in a WebView served over `https://localhost`, so the service worker,
`localStorage` and the safe-area insets all behave as they do in the browser.

```bash
npm run apk
```

That stages `www/`, syncs it into the Android project and runs
`./gradlew assembleDebug`. The result is at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy it to the phone and open it. Android will ask you to allow installing from
that source the first time — it is a debug-signed build, not a Play Store one, so
you get the "unknown app" warning. The app runs entirely offline; it asks for no
permissions.

### Toolchain

Building needs a JDK and the Android SDK:

```bash
brew install openjdk@21
brew install --cask android-commandlinetools
sdkmanager --sdk_root="$HOME/Library/Android/sdk" --licenses
sdkmanager --sdk_root="$HOME/Library/Android/sdk" \
  platform-tools "platforms;android-36" "build-tools;36.0.0"
```

Gradle needs `JAVA_HOME` and `ANDROID_HOME` set, and `android/local.properties`
pointing at the SDK:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

Changing the web app means re-running `npm run apk`; there is no separate build
step for the web side.

Homebrew's `avdmanager` and `sdkmanager` wrappers resolve the SDK root from their
own prefix, so they cannot see packages installed under `~/Library/Android/sdk`
and fail with `Package path is not valid`. Install `cmdline-tools;latest` into the
SDK root and use `$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager` instead.

### The Android theme

Three things in `android/` are deliberately not Capacitor defaults:

- `capacitor.config.json` sets `adjustMarginsForEdgeToEdge: "disable"`, so the web
  content runs under the system bars and the `env(safe-area-inset-*)` padding in
  `styles.css` does the spacing — otherwise there is a pale band at the top.
- `values/styles.xml` and `values/colors.xml` make the window background and launch
  screen the same warm near-black, instead of white.
- `MainActivity.java` asks for light status and navigation icons **on window focus**,
  not just in `onCreate`. Setting it in the theme or in `onCreate` alone does not
  survive the bridge's own window setup, which leaves near-black icons on the
  near-black background.

## Releasing a new version

```bash
npm run release 1.0.1
```

That runs the self-test, sets the version in `package.json` and the Android build
(bumping `versionCode`), commits, tags `v1.0.1` and pushes. GitHub Actions then
builds the APK and attaches it to the release, and the script waits and prints the
link.

Open the release page on the phone and tap the `.apk` to install it.

The workflow is `.github/workflows/release.yml`; a manual run from the Actions tab
builds the APK as a downloadable artifact instead of publishing a release. CI signs
each build with a fresh debug key, so if an update refuses to install, uninstall the
old copy first — or build locally with `npm run apk`, where the debug key is stable.

### Hosting it instead

Any static host works — it is plain files. Drop the folder on Netlify, GitHub Pages
or similar and open the URL on the phone. HTTPS is required for the service worker
(localhost is exempt, which is why the Wi-Fi route above works).

## What's in the set

Fifteen questions by default, spread as evenly as possible over the enabled topics
and ordered so the easy ones come first. 79 question types in all:

| Topic | Types | Covers |
| --- | --- | --- |
| Algebra | 12 | quadratics, simultaneous equations, cubics, inequalities, indices, algebraic fractions, remainder theorem, completing the square, discriminant, roots |
| Functions, logs & indices | 11 | log and index equations, composite and inverse functions, domains, exponential growth, transformations |
| Calculus | 16 | product/quotient/chain rules, trig, `e^x` and `ln`, tangents, turning points, definite integrals, areas, rates of change, optimisation, motion |
| Trigonometry | 13 | exact values, trig equations, sine/cosine rules, area, sectors, quadrants, double angles, identities, period and range, radians |
| Coordinate geometry | 13 | lines, perpendiculars, distance, midpoint, point-to-line, circles, intersections, tangents, triangle area, angle between lines, collinearity |
| Probability & statistics | 14 | binomial, combinations, arrangements, conditional probability, expected value, normal distribution, confidence intervals, hypothesis tests, mean and standard deviation |

Topics, set size, the animated background and the timer are all in **settings**.

Complex numbers and sequences & series are the two Higher Level topics not included —
adding them means one new file in `js/topics/` and one line in `js/questions.js`.

## Answering

Type answers naturally; the marker parses what a student would actually write.

- `3/4`, `0.75`, `3pi/4`, `sqrt(3)/2`, `-sqrt3/2`, `2e-3` all parse
- Expression answers are marked by evaluating your expression and the reference at
  several points, so **any algebraically equivalent form is accepted** — `0.5x - 1.5`
  passes where the reference is `(x-3)/2`
- `sin2x` means `sin(2x)`, the way it is written by hand, but `sinxcosx` is
  `sin(x)cos(x)`
- Lists (`2, -5`) are order-insensitive
- The row of keys above the field inserts `π √ ^ / ( ) − , e` without fighting the
  phone keyboard

Every question carries a hint and a worked solution, shown after you answer.

## Streak

Finishing the daily set extends the streak. Miss a day and it resets to 1 on the next
set you finish. **Extra practice** sets never touch the streak. A set you abandon
half-way is saved, and the home screen offers to resume it.

All progress is in `localStorage` on the device only.

## Layout

```
index.html            shell
styles.css            the whole design system
sw.js                 offline cache — bump VERSION when shell files change
manifest.webmanifest  home-screen install metadata
capacitor.config.json APK wrapper settings
android/              generated Android project (icons are generated into it)
www/                  staged copy of the web app, built from the files above
js/
  app.js              views, routing, session state
  questions.js        topic registry, daily set assembly
  store.js            streak, history, settings, resume
  mathexpr.js         expression parser + answer marking
  mathrender.js       LaTeX-subset renderer (no KaTeX, works offline)
  fmt.js              number, polynomial and surd formatting
  ascii-bg.js         animated maths-glyph background
  rng.js              seeded RNG; the daily seed comes from the date
  topics/*.js         the question generators
tools/
  selftest.mjs        exercises every generator
  gen-icons.mjs       draws the app icons, web and Android launcher
  build-www.mjs       stages www/ for the APK
  serve.mjs           static server
  mathgallery.html    dev page for eyeballing the maths typography
```

## Checking it still works

```bash
node tools/selftest.mjs 400
```

For each of the 79 generators it builds 400 instances and checks that the stated
answer is accepted by the marker, that a wrong answer is rejected, that every piece
of notation used is one the renderer knows, and that nothing renders as `NaN` or
`undefined`. It also checks daily sets come out at the right size, cover at least
five topics, and start easy. Run it after touching any generator.

## Design

Styled after [daoho.dev](https://daoho.dev): warm near-black `#1a1917`, cream
`#fff7f0`, surfaces that are just the foreground at 6% over a blur with no borders
or shadows, pill radii, lowercase monospace chrome, one burnt-orange accent. Question
text is set in a serif maths face; everything else is monospace.

The background is a grid of maths glyphs lit by slow interfering waves, with a few
formulae drifting across it and a scattering of orange accents. It holds at 24fps,
pauses when the tab is hidden, respects `prefers-reduced-motion`, and can be switched
off in settings.

Fonts are whatever the device already has — nothing is downloaded, so the app stays
fully offline.
