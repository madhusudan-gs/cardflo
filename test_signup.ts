import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function testSignup() {
    const testEmail = `test+${Date.now()}@example.com`;
    console.log(`Attempting to sign up with: ${testEmail}`);

    const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
    });

    if (error) {
        console.error('Signup Error:', error.message);
        return;
    }

    if (data.session) {
        console.log('❌ FAIL: A session was returned immediately. This means "Confirm Email" is OFF in Supabase.');
    } else if (data.user && data.user.identities && data.user.identities.length > 0) {
        console.log('✅ SUCCESS: No session returned. The user was created but requires email confirmation. "Confirm Email" is ON.');
    } else {
        console.log('⚠️ Unknown state:', data);
    }
}

testSignup();
