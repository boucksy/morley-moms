# Morley Moms

A private, invite-only app for the Morley Moms. It installs on iPhone and Android from a link (no app stores) and only approved members can see anything.

**Includes:** email-code sign-in; **Quick Add** (talk, type or snap a photo and the app fills in the form); events (PTO, school, volunteer, moms' outings, kids) with drop-off/pickup details and "add to calendar"; spelling lists with the test day, words, challenge words and a photo; and a members list you control.

### How Quick Add works
1. Tap **+**.
2. Tap the microphone and say it, type it, or tap **Snap the paper**.
3. The app decides whether it's a spelling list or an event, fills in the form (test day, words, challenge words, date, time, place, drop-off/pickup), and the mom checks it and taps **Post**.

Everything runs on the phone, for free. The photo reader (Tesseract) downloads once, a few MB, the first time someone snaps a photo. It reads printed sheets well; handwriting is hit-or-miss, so the photo is always attached too. If the mic button isn't available on a phone, the keyboard's 🎤 works the same way.

**Cost:** about $12/year for a domain. Everything else runs on free tiers.

---

## Where everything lives

| Place | What's there | Who can see it |
|---|---|---|
| **GitHub** (this repo) | The app's code only | Anyone (it's a public repo). Contains no group info. |
| **Supabase** | Member emails, events, spelling lists, photos | Only signed-in members on your approved list |
| **Resend** (optional) | Sends the 6-digit login emails | Stores nothing about the group |
| **Your domain** | Just the address people type | n/a |

The key in `config.js` is a *publishable* key and is meant to be public. The real lock is the set of rules in `supabase/schema.sql`: the database refuses to return anything unless the person is signed in **and** their email is on the members list.

---

## Try it right now (demo mode)

With `config.js` left blank, the app runs with sample data. Open `index.html` (or the GitHub Pages link once it's up), sign in with any email, and use the code **123456**. Nothing is saved in demo mode.

---

## Setup (about 30–45 minutes, once)

### 1. Put the code on GitHub
1. Create a new **public** repo, e.g. `morley-moms`.
2. Push these files to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
4. After a minute your app is live at `https://<your-username>.github.io/morley-moms/` (still in demo mode).

### 2. Create the Supabase project (free)
1. Sign up at supabase.com and create a new project (free plan; pick the US Central region if offered).
2. Go to **SQL Editor**, paste all of `supabase/schema.sql`, and click **Run**.
3. Add yourself as the first admin. In a new SQL query, run:
   ```sql
   insert into public.members (email, display_name, is_admin)
   values ('your-email@example.com', 'Miranda', true);
   ```

### 3. Turn on email-code sign-in
1. **Authentication → Sign In / Providers → Email**: make sure Email is enabled.
2. **Authentication → Emails → Templates → Magic Link**: replace the body with something like:
   ```html
   <h2>Your Morley Moms code</h2>
   <p>Enter this code in the app: <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>It expires in an hour. If you didn't ask for this, ignore it.</p>
   ```
   Do the same for the **Confirm signup** template (new members get that one the first time).
3. **Authentication → URL Configuration → Site URL**: set it to your app's address.
4. **(Recommended) Authentication → Hooks → Before User Created**: choose **Postgres** and the function `public.hook_before_user_created`. Now unknown emails can't even get a code.

Members stay signed in on their phones until they sign out.

### 4. Connect the app to Supabase
1. In Supabase, open **Project Settings → API Keys** (or the **Connect** button).
2. Copy the **Project URL** and the **Publishable key** into `config.js`. Set `ADMIN_CONTACT` to your name.
3. Commit and push. The live app now uses real data.

> Never paste the **secret** / **service_role** key or the database password into `config.js`.

### 5. Reliable login emails (do this before inviting everyone)
Supabase's built-in email is only meant for testing and sends very few emails per hour.
1. Buy a domain (about $12/year), e.g. from Cloudflare, Porkbun or Namecheap.
2. Create a free Resend account, add your domain, and add the DNS records it shows you.
3. In Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP** and enter Resend's SMTP details (host `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key, sender like `hello@yourdomain`).

### 6. Use your domain for the app (optional but nice)
1. GitHub repo → **Settings → Pages → Custom domain**: enter e.g. `app.yourdomain.com`, save, and tick **Enforce HTTPS** once available.
2. At your domain provider, add a `CNAME` record: `app` → `<your-username>.github.io`.
3. Update the Supabase **Site URL** to the new address.

### 7. Turn on the automations (GitHub → Settings → Secrets and variables → Actions → New repository secret)

**Keep-alive** (stops the free project pausing during quiet weeks):
- `SUPABASE_URL`: same as in `config.js`
- `SUPABASE_PUBLISHABLE_KEY`: same as in `config.js`

Then go to the **Actions** tab → **Keep Supabase awake** → **Run workflow** once to test it. If a run ever fails, GitHub emails you.

**Weekly backup** (copies the data to a private repo):
1. Create a second repo, `morley-moms-backups`, and make it **private**.
2. Create a fine-grained token (GitHub → Settings → Developer settings → Fine-grained tokens) with access to **only** that repo and **Contents: Read and write**.
3. Add these secrets to the main repo:
   - `SUPABASE_DB_URL`: Supabase → **Connect** → **Session pooler** connection string (with your database password filled in)
   - `BACKUP_REPO`: e.g. `yourname/morley-moms-backups`
   - `BACKUP_TOKEN`: the token from step 2

Note: backups include all the text data. Photos stay in Supabase Storage and are not copied.

---

## Adding moms

1. Open the app → **Members** tab → **+** → enter her name and email.
2. Send her the link plus the install steps below.

### Text to send
> Here's our Morley Moms app: **[your link]**
> 1. Open the link and sign in with your email. You'll get a 6-digit code.
> 2. **iPhone:** in Safari, tap Share → Add to Home Screen.
>    **Android:** in Chrome, tap ⋮ → Install app (or Add to Home screen).
> You'll stay signed in after that.

---

## Who can do what

- **Members:** see everything; post events and spelling lists; delete their own posts.
- **Admins:** all of that, plus add/remove members and delete any post.
- **Anyone else:** sees only the sign-in screen.

## Ideas for next versions
- Spelling practice mode (the phone reads each word aloud)
- Optional AI photo reader for handwritten sheets (small cost)
- Halloween walking route on a map
- Volunteer / supply sign-up slots ("I'll bring juice boxes")
- Donation drives
- Face ID / fingerprint sign-in (passkeys; Supabase support is currently in beta)
- Notifications when something new is posted

## Files
- `index.html`, `styles.css`, `app.js`: the app
- `quickadd.js`: turns what moms say or snap into a filled-in form
- `config.js`: your Supabase connection (public-safe values only)
- `manifest.webmanifest`, `sw.js`, `icons/`: make it installable
- `supabase/schema.sql`: database tables and security rules
- `.github/workflows/`: keep-alive and backup automations
