// Talent Sphere Voice Engine Audio Processing Utilities
// Handles 16kHz PCM Audio Recording and 24kHz PCM Audio Playback Queueing with Interruption support

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onAudioChunk: (base64Data: string) => void;

  constructor(onAudioChunk: (base64Data: string) => void) {
    this.onAudioChunk = onAudioChunk;
  }

  async start(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Using ScriptProcessorNode for cross-browser PCM buffer capture
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = this.convertFloat32ToInt16(inputData);
      const base64 = this.arrayBufferToBase64(pcm16.buffer);
      if (base64) {
        this.onAudioChunk(base64);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      const s = Math.max(-1, Math.min(1, buffer[l]));
      buf[l] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return buf;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private sampleRate: number;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  private initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playChunk(base64Pcm: string) {
    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Pcm);
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05; // 50ms buffer lead
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
      };
    } catch (e) {
      console.warn('Audio decode/play error:', e);
    }
  }

  stop() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    });
    this.activeSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
