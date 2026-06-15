# FFmpeg Post-Processing Notes

This document is now secondary to [docs/cs2-demo-rendering.md](/Users/gabrielfachini/Project/Gamerfied/gamerfied-highlights/docs/cs2-demo-rendering.md).

Important:

- FFmpeg does not render CS2 `.dem` files directly.
- FFmpeg should only be used after a CS2/HLAE renderer has captured frames or produced an intermediate video.
- The main product flow no longer requires uploading a full match recording.

## FFmpeg Command

```bash
ffmpeg -y \
  -ss START_SECONDS \
  -i SOURCE_VIDEO \
  -t DURATION_SECONDS \
  -c:v libx264 \
  -c:a aac \
  -movflags +faststart \
  OUTPUT.mp4
```

## Environment

```env
RENDER_DIR="./renders"
SOURCE_VIDEO_DIR="./source-videos"
FFMPEG_PATH="ffmpeg"
FFPROBE_PATH="ffprobe"
```

## Local Validation

```bash
npm run render:test
```

By default the low-level test expects:

```text
source-videos/render-test-sample.mp4
```

Or pass a custom file:

```bash
RENDER_TEST_SOURCE_VIDEO=/absolute/path/to/match-recording.mp4 npm run render:test
```

If the sample file is missing, the script prints instructions and exits without generating output.
