# GregMAT Vocab

Flashcards, quiz, word list and categories for the 810 GregMAT words (27 sets), built from your PDF.
React + Vite. Words and images are static files in the app. Your categories and progress are saved in
your browser, and synced across devices through Supabase (free tier) when you sign in with Google.

## Run it on your computer

```
npm install
npm run dev
```

Without any setup the app works right away and saves to that browser only.

## Turn on Google sign-in and sync (about 15 minutes)

1. **Supabase project.** Create a free project at supabase.com. In **SQL Editor**, paste and run `supabase/schema.sql`.
2. **Google credentials.** In Google Cloud Console, create an OAuth client (type: Web application).
   Under "Authorized redirect URIs" add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.
3. **Enable Google in Supabase.** Authentication > Providers > Google: paste the client ID and secret.
4. **Allowed URLs.** Authentication > URL Configuration: set Site URL to your Vercel address
   (for example `https://your-app.vercel.app`) and add `http://localhost:5173` to Redirect URLs.
5. **Keys.** Project Settings > API: copy the Project URL and the `anon` public key into `.env.local`
   (see `.env.example`) for local use, and into Vercel's Environment Variables for the live site.

## Deploy on Vercel (free)

1. Push this folder to a GitHub repository.
2. In Vercel, choose Add New > Project, import the repository. It detects Vite on its own.
3. Add the two environment variables from step 5, then deploy.

## How sync works

Each account has one row in `user_data` holding its categories and progress. The row is protected
so you can only read and write your own. If you change things on two devices before they sync,
the app merges them (it keeps all categories and, per word, the record with more answers).

## Pronunciation

Each card has a speaker button and the IPA spelling. The app asks the free Dictionary API (dictionaryapi.dev, no key needed)
for a recording and only uses it if it is American (file ends in `-us.mp3`). If there isn't one, it speaks the word with your
browser's built-in en-US voice, so every word can be played. Lookups are cached in the browser. Tick "Play the pronunciation
when a card appears" on the flashcards screen for autoplay.

## Notes

- 26 words have no picture in the source PDF and show as text-only cards.
- Re-importing a different PDF means regenerating `src/data/words.json` and `public/images/`.
