# DANIRYA — Version 1 Launch

## Ship today

```powershell
cd web
npm run build
npm start
```

## V1 architecture

- **Hero** — locked video scrub (no Blender re-render)
- **Hero → Gallery** — `HeroGalleryBridge` GSAP dissolve
- **Gallery** — museum exhibits, typography-first reveals
- **Studio** — How We Build / The Studio
- **Application** — exclusive partner form

Journey video (`components/journey/`) is **dormant** for V2.

## Deploy

| Platform | Root | Notes |
|----------|------|-------|
| Vercel | `web/` | `vercel.json` included |
| Railway | `web/` | `railway.json` included |

### Application email (Resend)

Set these Railway env vars (domain must be verified in Resend):

| Variable | Required | Example |
|----------|----------|---------|
| `RESEND_API_KEY` | Yes | `re_…` |
| `RESEND_FROM` | Yes | `Gilt Foundry <hello@your-verified-domain.com>` |
| `CONTACT_TO_EMAIL` | No | Defaults to `hello@giltfoundry.com` |
| `CONTACT_WEBHOOK_URL` | No | Optional secondary webhook |

Without `RESEND_API_KEY` / `RESEND_FROM`, `/api/contact` returns **500**.

## Verify before launch

- [ ] Hero opens pure black
- [ ] Hero scrubs smoothly
- [ ] Gallery feels like next room (not webpage)
- [ ] Studio connected
- [ ] Application submits
- [ ] Mobile layout checked
