import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ehmwvkxxoczoubbsjxvv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4'
);

async function run() {
  console.log("Signing in as admin...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "demo@nivasa.app",
    password: "demo123Password!",
  });

  if (authErr) {
    console.error("Sign in failed:", authErr);
    return;
  }

  // Get building
  const { data: building } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', 'b2827238-7796-4fd5-8142-ac2c1f2d006b')
    .single();

  console.log("Building details:", building);

  // Get landlord details from auth.users (via public function or check get_admin_users_list)
  // Let's create a temp SQL trigger or custom SQL query to select raw_user_meta_data from auth.users for user '200ff51c-2335-49d4-bca5-5ff42607b230'
  // Or we can create an RPC to inspect it, or see if we can query it!
  // Wait, let's write a script that creates a PL/pgSQL function to return raw_user_meta_data for the user, and execute it!
}
run();
