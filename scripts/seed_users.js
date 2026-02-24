
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aobytxpygfykombcxpgo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYnl0eHB5Z2Z5a29tYmN4cGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjgxOTgsImV4cCI6MjA4Njk0NDE5OH0.CM8pSIO7eQ2pd1WIrXJMFtZQzVhddniOtdItfbyVflE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createUsers() {
    const users = [
        { email: 'conductor@sama.com', password: 'sama2026', role: 'driver', name: 'Victor Baltazar' },
        { email: 'admin@sama.com', password: 'sama2026', role: 'admin', name: 'Admin User' }
    ];

    for (const user of users) {
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
        });

        if (error) {
            console.log(`Error creating ${user.email}:`, error.message);
        } else {
            console.log(`Created ${user.email} with ID: ${data.user.id}`);
        }
    }
}

createUsers();
