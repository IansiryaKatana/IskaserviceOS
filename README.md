# Iska Service OS

Powerful white-label platform for service businesses.

## Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Development

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm i
cp env.example .env   # Add your Supabase credentials
npm run dev
```

## Deploy to Netlify

1. Push to GitHub and connect the repo in [Netlify](https://app.netlify.com).
2. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add environment variables in **Site settings > Environment variables**:
   - `VITE_SUPABASE_URL` – Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` – Your Supabase anon key
4. Deploy.
