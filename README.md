# Sippy 💧

A water-tracking app built around **Sippy**, a thirsty axolotl you keep full of water. It's inspired by Water Llama, and every animation is written in code.

- **Animated onboarding** in 11 steps. Sippy stays on screen the whole way and reacts to everything you do: it waves, listens, nods and swims. You also get bouncy titles, buttons that wiggle until you tap them, a "try it before you sign up" demo, goal confetti, a fake notification preview, a plan-building loader and a mock paywall.
- **Home tracker.** Sippy is the water tank. It fills with waves and bubbles, a dashed ghost line previews the amount you're about to add, and there's a swipeable carousel of 10 drinks (coffee only counts as 80% water). The volume slider ticks as you drag, and adding a drink makes a splash and a jump. Reaching your goal triggers a celebration.
- **Pool.** Sippy floats on a ring. Tilt your phone and it drifts downhill, or tap and drag to steer. It leaves ripples behind it as it moves.
- **History.** Seven bars grow in one after another, with a streak counter and weekly stats.
- **Settings.** Units, daily goal, sound, reminders, custom drinks, replay the intro, and sign out.
- **Accounts and data** are stored in [Supabase](https://supabase.com): email and password login, plus `profiles` and `drink_logs` tables protected by row-level security.

The mascot is an original SVG built from separate parts (tail, 6 gills, arms, eyes, body), each rotating around its own joint. That's why the motion feels fluid rather than puppet-like. The sound effects are generated in code by `tools/make-sfx.mjs`, so there's nothing to license.

## Run it on your phone (Expo Go)

```bash
npm install
npx expo start
```

Scan the QR code with your phone camera (iOS) or the Expo Go app (Android). Everything used is bundled in Expo Go, so no custom build is needed. Phone tilt only works on a real device.

To try it in a browser, run `npx expo start --web` (in the browser you steer the pool screen with taps and drags).

## Supabase

The app talks to the Supabase project in `.env`. It uses the publishable key, which is safe to ship inside an app. To point it at a different project:

1. Run `supabase/migrations/0001_init.sql` in that project (tables, RLS policies, and the trigger that creates a profile on sign-up).
2. Copy `.env.example` to `.env` and fill in that project's URL and publishable key.

**Email confirmation.** Supabase asks new users to confirm their email by default, and the app handles this ("Check your inbox", then sign in). For quick testing you can switch it off in the dashboard under **Authentication → Sign In / Providers → Email → Confirm email**. Supabase's built-in mailer is heavily rate-limited, so add your own SMTP server under **Authentication → Emails** before real users sign up.

## Project layout

```
src/app/                 screens (expo-router): onboarding, auth, (tabs)/index|pool|history, settings
src/onboarding/          the persistent Stage, the step wrapper, and one file per onboarding step
src/mascot/Sippy.tsx     the animated axolotl rig (poses, actions, tank mode)
src/water/Water.tsx      scrolling waves, bubbles, ghost preview level
src/components/          buttons, chips, slider, drink carousel, confetti, splash…
src/lib/                 Supabase client, zustand store, drinks, units, goal maths, sounds, reminders
tools/make-sfx.mjs       regenerates assets/sfx/*.wav
assets/sippy-icon.svg    source art for the app icon
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Higgsfield

No Higgsfield credits were used. If you want to swap a pose for a generated video loop later (for example a smoother swimming clip), `Sippy` is the single place to do it.
