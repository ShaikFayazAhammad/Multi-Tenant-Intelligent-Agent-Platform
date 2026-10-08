/**
 * Audio noise reduction utilities
 * These utilities help filter out background noise from audio streams
 */

/**
 * Apply noise reduction constraints to getUserMedia audio constraints
 */
export function getNoiseReducedAudioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000, // Optimal for speech recognition
    channelCount: 1, // Mono for speech
    // Additional Google-specific constraints (may not be available in all browsers)
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true,
    googTypingNoiseDetection: true,
    googNoiseReduction: true,
  } as any
}

/**
 * Filter out low-confidence speech recognition results (likely noise)
 */
export function filterNoiseResults(
  transcript: string,
  confidence?: number,
  minConfidence: number = 0.3
): boolean {
  // If confidence is available and below threshold, filter it out
  if (confidence !== undefined && confidence < minConfidence) {
    return false
  }
  
  // Filter out very short transcripts (likely noise)
  if (transcript.trim().length < 2) {
    return false
  }
  
  // Filter out common noise patterns
  const noisePatterns = [
    /^[h]+$/i, // Just "h" sounds
    /^[a]+$/i, // Just "a" sounds
    /^[uh]+$/i, // Just "uh" sounds
    /^[um]+$/i, // Just "um" sounds
  ]
  
  for (const pattern of noisePatterns) {
    if (pattern.test(transcript.trim())) {
      return false
    }
  }
  
  return true
}

/**
 * Normalize transcript by removing common noise words and patterns
 */
export function cleanTranscript(transcript: string): string {
  return transcript
    .trim()
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove common filler words at the start/end
    .replace(/^(um|uh|ah|er|hmm)\s+/gi, '')
    .replace(/\s+(um|uh|ah|er|hmm)$/gi, '')
    .trim()
}

/**
 * Check if speech is meaningful (not just noise) for barge-in
 * Returns true if the speech should trigger a new backend response
 */
export function isMeaningfulSpeech(transcript: string, confidence?: number): boolean {
  const cleaned = cleanTranscript(transcript)
  
  // Too short to be meaningful
  if (cleaned.length < 3) {
    return false
  }
  
  // Low confidence suggests noise
  if (confidence !== undefined && confidence < 0.4) {
    return false
  }
  
  // Check if it's just filler words
  const fillerOnlyPattern = /^(um|uh|ah|er|hmm|oh|well|like|you know|i mean)$/i
  if (fillerOnlyPattern.test(cleaned)) {
    return false
  }
  
  // Check if it contains actual words (not just sounds)
  const wordPattern = /\b[a-z]{2,}\b/i
  if (!wordPattern.test(cleaned)) {
    return false
  }
  
  // If it passes all checks, it's likely meaningful
  return true
}

