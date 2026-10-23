// A single local, looping recording. Browsers only start it after an interaction.
export function createMusicPlayer(getPreferences) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  let unlocked = false, theme = null, pending = false, generation = 0;
  let speechGeneration = 0, speechTimer, speechDucked = false;
  let effectTimer, effectUntil = 0;
  const volume = () => {
    const value = getPreferences().volume;
    // The slider is a relative music level, with headroom for the short cues.
    // Also applies to existing saved settings, including a previous 100% level.
    const base = Math.min(.16, (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .1) * .35);
    return base * (effectUntil > performance.now() ? .04 : speechDucked ? .12 : 1);
  };
  function sync() {
    const preferences = getPreferences();
    audio.volume = volume();
    if (!unlocked || !preferences.theme || preferences.enabled === false || audio.volume === 0 || document.hidden) {
      generation++; pending = false; audio.pause(); return;
    }
    if (theme !== preferences.theme) {
      generation++; pending = false; audio.pause();
      theme = preferences.theme;
      audio.src = new URL(`../assets/audio/${theme === 'island' ? 'island' : 'space'}.mp3`, import.meta.url).href;
    }
    if (!audio.paused || pending) return;
    const request = ++generation;
    pending = true;
    try {
      Promise.resolve(audio.play()).catch(() => {}).finally(() => {
        if (request !== generation) return;
        pending = false;
        // A settings change or backgrounding can race with play().
        if (getPreferences().enabled === false || document.hidden) audio.pause();
      });
    } catch { pending = false; }
  }
  function interact(event) {
    if (!event.isTrusted) return;
    unlocked = true; sync();
  }
  document.addEventListener('click', interact, true);
  document.addEventListener('keydown', interact, true);
  document.addEventListener('visibilitychange', sync);
  return {
    sync,
    beginEffect(duration) {
      effectUntil = Math.max(effectUntil, performance.now() + Math.max(0, duration) * 1000 + 120);
      clearTimeout(effectTimer);
      audio.volume = volume();
      effectTimer = setTimeout(() => { effectUntil = 0; sync(); }, Math.max(0, effectUntil - performance.now()));
    },
    endEffects() {
      clearTimeout(effectTimer); effectUntil = 0; sync();
    },
    beginSpeech() {
      const request = ++speechGeneration;
      clearTimeout(speechTimer);
      speechDucked = true; audio.volume = volume();
      const finish = () => {
        if (request !== speechGeneration) return;
        clearTimeout(speechTimer); speechDucked = false; sync();
      };
      // Some mobile speech engines never send end/error when interrupted.
      speechTimer = setTimeout(finish, 30000);
      return finish;
    },
  };
}
