/**
 * Lightweight beauty pipeline: slight blur (soft skin) + brightness/sat.
 * Returns a canvas-captured video track for publishing to LiveKit.
 */

export class BeautyVideoTrack {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private out: MediaStream | null = null;
  private running = false;
  private enabled = true;

  constructor() {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "true");
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas unsupported");
    this.ctx = ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  async start(source: MediaStreamTrack): Promise<MediaStreamTrack> {
    this.stop();
    const input = new MediaStream([source]);
    this.video.srcObject = input;
    await this.video.play().catch(() => {});

    const w = source.getSettings().width || 640;
    const h = source.getSettings().height || 480;
    this.canvas.width = w;
    this.canvas.height = h;

    this.out = this.canvas.captureStream(24);
    this.running = true;

    const draw = () => {
      if (!this.running) return;
      const vw = this.video.videoWidth || w;
      const vh = this.video.videoHeight || h;
      if (vw && vh) {
        if (this.canvas.width !== vw || this.canvas.height !== vh) {
          this.canvas.width = vw;
          this.canvas.height = vh;
        }
        if (this.enabled) {
          this.ctx.filter =
            "brightness(1.1) contrast(1.04) saturate(1.08) blur(0.7px)";
        } else {
          this.ctx.filter = "none";
        }
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      }
      this.raf = requestAnimationFrame(draw);
    };
    draw();

    const track = this.out.getVideoTracks()[0];
    if (!track) throw new Error("beauty track failed");
    return track;
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.out?.getTracks().forEach((t) => t.stop());
    this.out = null;
    this.video.srcObject = null;
    // Do not stop the source camera track — caller owns it.
  }
}
