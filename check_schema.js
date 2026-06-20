import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://ehmwvkxxoczoubbsjxvv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobXd2a3h4b2N6b3ViYnNqeHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzc5NjIsImV4cCI6MjA5MjcxMzk2Mn0._1thy8Nq3dsGBvEA8b_FPFbTbCyDk1fbwqxgUULDPG4');

async function check() {
  const { data, error } = await supabase.from('staff_allocations').select('*').limit(1);
  console.log("staff_allocations", { data, error });
  
  const { data: staff, error: e2 } = await supabase.from('staff').select('*').limit(1);
  console.log("staff", { staff, e2 });
}
check();
