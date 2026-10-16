# Sippy 💧

A water-tracking app built around **Sippy**, a thirsty axolotl you keep full of water. It's inspired by Waterllama, and every animation is written in code.

## What's in it

- **Animated onboarding** in 11 steps. Sippy stays on screen the whole way and reacts as you go: it waves, listens, nods and swims. There's a "try it before you sign up" demo, a goal calculator (weight, sex, activity and climate), goal confetti, wake and sleep times for reminders, a plan-building loader and a mock paywall.
- **Today.** Sippy is the water tank:
  - The water sloshes when you add a drink, then settles.
  - A dashed line previews the amount before you add it, and Sippy glances at the slider while you choose.
  - Cup-size presets: sip, cup, glass, mug, bottle and big bottle.
  - A drink carousel shows your favourites first, and "All drinks" opens 42 drinks with search, categories, favourites and custom drinks.
  - Each drink carries its own water content, caffeine and calories, with today's totals shown on screen.
  - There's a hydration tip of the day, a streak badge, and a recap when you reach your goal. Tap any entry to edit its amount or time, or delete it.
- **Calendar.** A month view where each day fills a ring towards your goal, plus a monthly recap (days on target, average, best day, total, caffeine, favourite drink) and your current and best streaks. Tap a day to see, edit or add drinks.
- **Pool.** Sippy floats on a ring. Tilt your phone and it drifts downhill, or tap and drag to steer, and it leaves ripples behind it.
- **Challenges and collectables.** 7 challenges (Seven Day Splash, Early Sipper, Caffeine Detox, Soda-Free Week, Taste Tester, Big Gulp, Hydration Hero). Progress is worked out from your drink log, and finishing one unlocks a new Sippy colour morph. There are 8 to collect, all based on real axolotl colours.
- **Smart reminders.** Nudges between your wake and sleep times at the interval you choose, with a choice of sound. Sippy skips a nudge if you drank in the last 45 minutes and stops for the day once you reach your goal.
- **Settings.** Goal recalculation, units, default cup, reminders, favourites and custom drinks, sound and vibration toggles, replay the intro, and sign out.
- **Accounts and data** are stored in [Supabase](https://supabase.com). Logins use email and password, and the `profiles`, `drink_logs` and `user_challenges` tables are protected by row-level security.

## How the motion works

The mascot (`src/mascot/Sippy.tsx`) is an original SVG built from separate parts, and its motion follows character-animation practice rather than looping sine waves:

- **Breathing** has a quicker inhale than exhale, and its pace drifts. **Blinks** come at random intervals, sometimes doubled.
- **The gills and tail are simulated springs** driven by how fast the body moves. They trail behind a jump and overshoot when Sippy lands.
- **Big moves wind up first.** Sippy crouches before a jump and dips before a wave, then settles on a spring.
- **When idle**, Sippy does a small random gesture every few seconds (looks around, flicks its tail, ruffles its gills, shifts its weight, yawns) and is calm in between.
- **Buttons don't shake constantly.** They give one gentle nudge after a few idle seconds.

## Sounds

The sounds are real recordings released into the public domain (CC0), from Kenney and OpenGameArt. See `assets/sfx/CREDITS.md`. `python3 tools/build-sfx.py` downloads the sources and builds the app's sounds. It trims leading silence so taps feel instant, levels loudness across the set, layers a splash with bubbles for the "pour", and renders 3 pitch variants of each sound. The app picks a different variant each time, so repeated taps don't sound mechanical.

## Run it on your phone (Expo Go)

```bash
npm install
npx expo start
```

Scan the QR code with your phone camera (iOS) or the Expo Go app (Android). Phone tilt only works on a real device.

Reminder sounds are bundled through the `expo-notifications` plugin, so they only play in a development or App Store build. In Expo Go, reminders use the phone's default sound.

To try it in a browser, run `npx expo start --web`. There you steer the pool screen with taps and drags.

## Supabase

The app talks to the Supabase project in `.env`. It uses the publishable key, which is safe to ship inside an app. To point it at a different project:

1. Run `supabase/migrations/0001_init.sql`, then `0002_features.sql`, in that project.
2. Copy `.env.example` to `.env` and fill in that project's URL and publishable key.

**Email confirmation.** Supabase asks new users to confirm their email by default, and the app handles this ("Check your inbox", then sign in). For quick testing you can turn it off in the dashboard under **Authentication → Sign In / Providers → Email → Confirm email**. Supabase's built-in mailer is heavily rate-limited, so add your own SMTP server under **Authentication → Emails** before real users sign up.

## Project layout

```
src/app/                 screens: onboarding, auth, settings, (tabs)/index|calendar|pool|challenges
src/onboarding/          the persistent Stage, the step wrapper, and one file per onboarding step
src/mascot/              Sippy.tsx (the animated rig) and skins.ts (colour morphs)
src/water/Water.tsx      waves, bubbles, slosh and the preview line
src/components/          buttons, chips, slider, sheets, drink picker, log editor, confetti…
src/lib/                 store, Supabase client, drinks, stats, challenges, tips, goal maths, sounds, reminders
supabase/migrations/     database schema
tools/build-sfx.py       rebuilds assets/sfx from the CC0 sources
assets/sippy-icon.svg    source art for the app icon
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
