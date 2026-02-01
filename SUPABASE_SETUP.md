# Supabase Setup Guide

Follow these steps to configure your backend for Cardflo.

## 1. Create Project
1.  Go to [database.new](https://database.new) and sign in with GitHub.
2.  **Organization**: Select your org (or create one).
3.  **Name**: `cardflo`
4.  **Database Password**: Generate a strong password and save it (you likely won't need it, but good practice).
5.  **Region**: Choose one close to you (e.g., US East, EU Central).
6.  Click **Create new project**.

## 2. Get API Keys
Once the project is created (takes ~1-2 mins):
1.  Go to **Project Settings** (gear icon at bottom left).
2.  Click **API**.
3.  Copy the **Project URL**.
4.  Copy the **`anon` public** key.

## 3. Configure Local Environment
1.  Open the file `.env.local` in this project.
2.  Paste your values:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

## 4. Run Database Schema
1.  In the Supabase Dashboard, go to step 2 **SQL Editor** (icon looks like validaiton check / terminal on the left sidebar).
2.  Click **New Query**.
3.  Copy the contents of the file `supabase_schema.sql` in your project folder.
4.  Paste it into the SQL Editor.
5.  Click **Run** (bottom right of the editor).

## 5. Mobile/Auth Config (Optional but Recommended)
1.  Go to **Authentication** > **URL Configuration**.
2.  Ensure **Site URL** is set to `http://localhost:3000` for local development.
3.  In **Redirect URLs**, add `http://localhost:3000/**`.

## 6. Verification
1.  Go to the **Table Editor** (grid icon on left).
2.  You should see tables: `leads`, `profiles`, `teams`, `team_members`.
3.  Go to your app terminal and run `npm run dev`.
4.  Open `http://localhost:3000` and try to **Sign Up**.
