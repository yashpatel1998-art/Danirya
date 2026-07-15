# Danirya Studio — Production Web

Final production application for the Danirya Studio immersive experience.

## Hero Master Sequence

Production 4K PNG sequence (280 frames) integrated via canvas scroll playback.

```powershell
# From project root — link frames into public/
..\scripts\link_hero_frames.ps1
```

- **Path:** `/hero/frames/frame_0001.png` … `frame_0280.png`
- **Interpolation:** Scroll target eases smoothly; canvas crossfades between adjacent frames
- **Preload:** First 35 frames; remaining frames lazy-loaded ahead of playback
- **Component:** `components/HeroSequence.tsx`

## Contact Form

The contact section features:
- Floating email hero: `hello@daniryastudio.com`
- Form fades up 0.8s after section enters viewport
- Premium dark museum aesthetic
- Full validation and success state

## Development

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000 — scroll the Hero, then continue to Contact.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CONTACT_WEBHOOK_URL` | Optional webhook URL for form submissions (Zapier, Make, custom API) |

## Production (Railway)

```bash
npm run build
npm start
```

Set `CONTACT_WEBHOOK_URL` in Railway environment variables.

## Blender Production

Run once to remove experimental features and save production blend:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" "Danirya_Studio_Master.blend" --background --python "scripts\production_monument.py"
```

## Status

**Feature development complete.** Further work: bug fixes, optimization, deployment only.
