// Configuration for Station95 Admin App
// Update these values with your actual Supabase credentials

window.APP_CONFIG = {
  // Supabase Configuration
  // Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
  SUPABASE_URL: 'https://epelybsicuwiircgcmqd.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwZWx5YnNpY3V3aWlyY2djbXFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTQ3MTksImV4cCI6MjA3ODUzMDcxOX0.rS89-Y9NBlBL3f36IZJsFp9jWJCFygIUSAiRcTCGgpU', // This is safe to expose (public key)

  // API Gateway (for calendar operations, not auth)
  API_BASE_URL: window.API_BASE_URL || 'https://kdbo4zp9u1.execute-api.us-east-1.amazonaws.com/prod',
};

// Note: The SUPABASE_ANON_KEY is safe to expose in frontend code.
// It's a public key that only allows operations permitted by your Row Level Security (RLS) policies.
// Never expose your SUPABASE_SERVICE_KEY in frontend code!
