// Configuration for Station95 Admin App
// Update these values with your actual Supabase credentials

window.APP_CONFIG = {
  // Supabase Configuration
  // Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
  SUPABASE_URL: 'https://epelybsicuwiircgcmqd.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE', // This is safe to expose (public key)

  // API Gateway (for calendar operations, not auth)
  API_BASE_URL: window.API_BASE_URL || 'http://localhost:8080',
};

// Note: The SUPABASE_ANON_KEY is safe to expose in frontend code.
// It's a public key that only allows operations permitted by your Row Level Security (RLS) policies.
// Never expose your SUPABASE_SERVICE_KEY in frontend code!
