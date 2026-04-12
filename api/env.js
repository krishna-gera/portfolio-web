export default function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_URI || '';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  });
}
