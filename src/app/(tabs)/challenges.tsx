import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Confetti } from '../../components/Confetti';
import { Sheet } from '../../components/Sheet';
import { CHALLENGES, evaluate, findChallenge, type ChallengeDef, type ChallengeProgress } from '../../lib/challenges';
import { feedback, play } from '../../lib/feedback';
import { unlockedSkins, useApp } from '../../lib/store';
import type { UserChallenge } from '../../lib/supabase';
import { Sippy } from '../../mascot/Sippy';
import { findSkin, SKINS } from '../../mascot/skins';
import { colors, fonts, shadow } from '../../theme';

export default function Challenges() {
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);
  const challenges = useApp((s) => s.challenges);
  const customDrinks = useApp((s) => s.customDrinks);
  const joinChallenge = useApp((s) => s.joinChallenge);
  const endChallenge = useApp((s) => s.endChallenge);
  const updateProfile = useApp((s) => s.updateProfile);
  const goal = profile?.daily_goal_ml ?? 2000;
  const owned = useMemo(() => unlockedSkins(challenges), [challenges]);
  const [unlocked, setUnlocked] = useState<{ skin: string; challenge: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const active = challenges.filter((c) => c.status === 'active');
  const progress = useMemo(
    () => new Map(active.map((c) => [c.id, evaluate(findChallenge(c.challenge_id)!, c.started_at, logs, goal, customDrinks)])),
    [active, logs, goal, customDrinks],
  );
  const doneIds = new Set(challenges.filter((c) => c.status === 'completed').map((c) => c.challenge_id));

  // Finishing a challenge is detected from the log; celebrate and unlock the reward.
  const handled = useRef(new Set<string>());
  useEffect(() => {
    for (const c of active) {
      const p = progress.get(c.id);
      const def = findChallenge(c.challenge_id);
      if (p?.done && def && !handled.current.has(c.id)) {
        handled.current.add(c.id);
        endChallenge(c.id, 'completed')
          .then(() => {
            play('celebrate');
            setUnlocked({ skin: def.reward, challenge: def.name });
          })
          .catch((e) => setError(e.message));
      }
    }
  }, [active, progress, endChallenge]);

  const join = async (def: ChallengeDef) => {
    setError(null);
    try {
      await joinChallenge(def.id);
      feedback('unlock', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start that challenge.');
    }
  };

  const restart = async (c: UserChallenge) => {
    await endChallenge(c.id, 'quit');
    await joinChallenge(c.challenge_id);
    feedback('unlock', 'success');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.sub}>Finish a challenge to unlock a new Sippy.</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        {active.length > 0 && <Text style={styles.section}>In progress</Text>}
        {active.map((c, i) => {
          const def = findChallenge(c.challenge_id);
          const p = progress.get(c.id);
          if (!def || !p) return null;
          return <ActiveCard key={c.id} def={def} p={p} index={i} onQuit={() => endChallenge(c.id, 'quit')} onRestart={() => restart(c)} />;
        })}

        <Text style={styles.section}>Pick a challenge</Text>
        {CHALLENGES.filter((d) => !active.some((a) => a.challenge_id === d.id)).map((def, i) => (
          <Animated.View key={def.id} entering={FadeInDown.delay(i * 60).springify().damping(16)} layout={LinearTransition.springify()} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.icon}>{def.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{def.name}</Text>
                <Text style={styles.desc}>{def.description}</Text>
              </View>
              <Pressable onPress={() => setPreview(def.reward)} accessibilityLabel={`Preview reward ${findSkin(def.reward).name}`}>
                <View style={[styles.reward, doneIds.has(def.id) && { opacity: 0.5 }]}>
                  <Sippy size={52} skin={def.reward} idle={false} />
                </View>
              </Pressable>
            </View>
            <Button title={doneIds.has(def.id) ? 'Do it again' : 'Start challenge'} variant={doneIds.has(def.id) ? 'soft' : 'primary'} sound={null} onPress={() => join(def)} style={{ minHeight: 46, marginTop: 10 }} />
          </Animated.View>
        ))}

        <Text style={styles.section}>Your Sippys</Text>
        <Text style={styles.sub}>Tap one you own to make it your water buddy.</Text>
        <View style={styles.grid}>
          {SKINS.map((s) => {
            const has = owned.has(s.id);
            const current = (profile?.character ?? 'leucistic') === s.id;
            const from = CHALLENGES.find((c) => c.reward === s.id);
            return (
              <Pressable
                key={s.id}
                style={[styles.skin, current && styles.skinOn]}
                onPress={() => {
                  if (!has) {
                    feedback('error', 'warning');
                    setPreview(s.id);
                    return;
                  }
                  feedback('select', 'success');
                  updateProfile({ character: s.id }).catch((e) => setError(e.message));
                }}
                accessibilityLabel={has ? `${s.name}${current ? ', selected' : ''}` : `${s.name}, locked. ${from ? `Finish ${from.name} to unlock.` : ''}`}
                testID={`skin-${s.id}`}
              >
                <View style={!has && { opacity: 0.35 }}>
                  <Sippy size={78} skin={s.id} idle={false} pose={current ? 'wave' : 'idle'} />
                </View>
                {!has && <Text style={styles.lock}>🔒</Text>}
                <Text style={styles.skinName}>{s.name}</Text>
                <Text style={styles.skinHow} numberOfLines={2}>{has ? (current ? 'Your buddy' : 'Tap to choose') : from ? from.name : ''}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Sheet open={!!unlocked} onClose={() => setUnlocked(null)} title="New Sippy unlocked!" height={0.75}>
        {unlocked && (
          <View style={styles.unlock}>
            <Confetti burst={1} count={40} spread={220} />
            <Sippy size={180} pose="cheer" skin={unlocked.skin} />
            <Text style={styles.unlockName}>{findSkin(unlocked.skin).name}</Text>
            <Text style={styles.unlockText}>You finished {unlocked.challenge}. {findSkin(unlocked.skin).blurb}</Text>
            <Button
              title={`Make ${findSkin(unlocked.skin).name} my buddy`}
              onPress={() => {
                updateProfile({ character: unlocked.skin }).catch(() => {});
                setUnlocked(null);
              }}
            />
            <Button title="Later" variant="ghost" onPress={() => setUnlocked(null)} />
          </View>
        )}
      </Sheet>

      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview ? findSkin(preview).name : ''} height={0.6}>
        {preview && (
          <View style={styles.unlock}>
            <Sippy size={150} pose="wave" skin={preview} />
            <Text style={styles.unlockText}>{findSkin(preview).blurb}</Text>
            <Text style={styles.unlockHow}>
              {owned.has(preview) ? 'You own this one.' : `Finish “${CHALLENGES.find((c) => c.reward === preview)?.name}” to unlock.`}
            </Text>
          </View>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function ActiveCard({ def, p, index, onQuit, onRestart }: { def: ChallengeDef; p: ChallengeProgress; index: number; onQuit: () => void; onRestart: () => void }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withDelay(150 + index * 80, withSpring(p.value / p.target, { damping: 14, stiffness: 80 })));
  }, [p.value, p.target, index, w]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(4, w.value * 100)}%` }));
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} layout={LinearTransition.springify()} style={[styles.card, styles.activeCard]}>
      <View style={styles.cardTop}>
        <Text style={styles.icon}>{def.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{def.name}</Text>
          <Text style={styles.desc}>{def.description}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, p.failed && { backgroundColor: colors.line }, bar]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {p.value} / {p.target} {def.unit}
        </Text>
        <Text style={styles.progressText}>{p.failed ? p.note ?? 'Time is up' : p.daysLeft != null ? `${p.daysLeft} day${p.daysLeft === 1 ? '' : 's'} left` : ''}</Text>
      </View>
      {p.failed ? (
        <Button title="Try again" variant="soft" sound={null} onPress={onRestart} style={{ minHeight: 44, marginTop: 8 }} />
      ) : (
        <Pressable onPress={onQuit} style={styles.quit}>
          <Text style={styles.quitText}>Give up</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 130, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft, marginTop: -6 },
  error: { fontFamily: fonts.medium, color: '#D9435F' },
  section: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 14, ...shadow },
  activeCard: { borderWidth: 2.5, borderColor: colors.water },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 30 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  desc: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 19 },
  reward: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  track: { height: 12, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden', marginTop: 12 },
  fill: { height: 12, borderRadius: 6, backgroundColor: colors.water },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  quit: { alignSelf: 'flex-end', marginTop: 4, padding: 4 },
  quitText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skin: { width: '31%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 22, paddingVertical: 10, alignItems: 'center', borderWidth: 2.5, borderColor: 'transparent' },
  skinOn: { borderColor: colors.pinkDeep },
  lock: { position: 'absolute', top: 36, fontSize: 22 },
  skinName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  skinHow: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft, textAlign: 'center', paddingHorizontal: 4 },
  unlock: { alignItems: 'center', padding: 20, gap: 8 },
  unlockName: { fontFamily: fonts.bold, fontSize: 28, color: colors.pinkDeep },
  unlockText: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft, textAlign: 'center', lineHeight: 21, marginBottom: 6 },
  unlockHow: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textAlign: 'center' },
});
