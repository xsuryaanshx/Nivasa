import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('tenants').select('document_url').limit(1)
  console.log('document_url:', error ? error.message : 'exists')
  
  const { data: d2, error: e2 } = await supabase.from('tenant_documents').select('*').limit(1)
  console.log('tenant_documents:', e2 ? e2.message : 'exists')
}

test()
