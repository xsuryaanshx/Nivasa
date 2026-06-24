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

  console.log("Updating building Maduvan's UPI ID to amishatiwari100@oksbi...");
  const { data: updated, error: updateErr } = await supabase
    .from('buildings')
    .update({ upi_id: 'amishatiwari100@oksbi' })
    .eq('id', 'b2827238-7796-4fd5-8142-ac2c1f2d006b')
    .select();

  if (updateErr) {
    console.error("Error updating building UPI ID:", updateErr);
  } else {
    console.log("Successfully updated building UPI ID:", updated);
  }
}
run();
