import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lsgwqllgeretvagizgio.supabase.co/rest/v1/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZ3dxbGxnZXJldHZhZ2l6Z2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODU4MjMsImV4cCI6MjEwNTU2MTgyM30.6TMf80gNXXcsPpbsd4G-71zitbiQ1j8JNh8yD5DxDas';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);