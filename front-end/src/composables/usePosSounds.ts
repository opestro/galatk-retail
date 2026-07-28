let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playTone(frequency: number, durationMs: number, volume = 0.15) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // Autoplay policies may block until user gesture — ignore silently
  }
}

export function playPosSuccessSound() {
  playTone(880, 80)
  window.setTimeout(() => playTone(1175, 120), 90)
}

export function playPosErrorSound() {
  playTone(220, 200, 0.12)
}
