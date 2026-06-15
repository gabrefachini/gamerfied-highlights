# CS2 Demo Rendering

`.dem` is not video.

Important:

- A CS2 demo file contains replay data, not pixels.
- FFmpeg cannot render `.dem` files directly.
- FFmpeg is only useful after a renderer has already captured frames or produced an intermediate video.

## Recommended MVP Architecture

Input:

- `demoPath`
- selected `HighlightCandidate`
- `startTick`
- `endTick`

Pipeline:

1. Prepare render job
2. Launch CS2/HLAE or another configured renderer
3. Load demo
4. Seek to `startTick`
5. Capture frames or video until `endTick`
6. Post-process with FFmpeg if needed
7. Save MP4

## Current Product State

The main flow no longer requires uploading a full match recording.

Current behavior:

- Upload `.dem`
- Detect highlight candidates
- Select highlight
- Attempt demo-based render

If no renderer is configured, the system shows:

```text
Renderer not configured yet.
```

and the main action remains disabled:

```text
Renderer setup required
```

## Recommended Local Renderer

The recommended MVP direction is a local Windows renderer using:

- CS2
- HLAE
- a capture/export pipeline
- FFmpeg only for post-processing

## Future Work

- Full local Windows renderer integration
- Automated CS2 launch/orchestration
- HLAE capture scripts
- Cloud/AWS rendering workers
- Asset storage and delivery
