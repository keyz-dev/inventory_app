# Supabase Setup Guide for Inventory App

This guide will help you set up Supabase as your backend for the inventory app sync functionality.

## Prerequisites

- A Supabase account (free at [supabase.com](https://supabase.com))
- Your React Native project with the inventory app

## Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)** and sign up/sign in
2. **Click "New Project"**
3. **Fill in the details:**
   - **Name**: `inventory-app` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free
4. **Wait for project creation** (takes 1-2 minutes)

## Step 2: Get API Credentials

Once your project is ready:

1. **Go to Settings → API**
2. **Copy these values:**
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Install Dependencies

Run this command in your project directory:

```bash
npm install @supabase/supabase-js
```

## Step 4: Set Up Environment Variables

Create a `.env` file in your project root (or add to existing one):

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Override sync configuration
EXPO_PUBLIC_SYNC_INTERVAL=15
EXPO_PUBLIC_MAX_RETRIES=3
EXPO_PUBLIC_BATCH_SIZE=50
```

**Replace the values with your actual Supabase credentials!**

## Step 5: Set Up Database Schema

1. **Go to your Supabase project dashboard**
2. **Click on "SQL Editor" in the left sidebar**
3. **Click "New Query"**
4. **Copy and paste the contents of `docs/supabase-schema.sql`**
5. **Click "Run" to execute the SQL**

This will create all the necessary tables:
- `products` - Your inventory items
- `categories` - Product categories
- `sync_queue` - Offline operations queue
- `meta` - App metadata
- `sales` - Sales records
- `stock_adjustments` - Stock change records

## Step 6: Test the Setup

1. **Start your React Native app:**
   ```bash
   npm start
   ```

2. **Check the console logs** - you should see:
   ```
   ✅ Supabase configuration valid
   ✅ Using Supabase sync service
   ```

3. **Go to the Sync tab** in your app and try a manual sync

## Step 7: Verify Data in Supabase

1. **Go to your Supabase project dashboard**
2. **Click on "Table Editor"**
3. **You should see your tables created**
4. **Check the `meta` table** - it should have a `lastSyncedAt` entry after your first sync

## Troubleshooting

### Common Issues

**❌ "Supabase configuration missing!"**
- Make sure you've set the environment variables correctly
- Restart your development server after adding environment variables

**❌ "Invalid Supabase URL format"**
- Check that your URL includes `supabase.co`
- Make sure there are no extra spaces or characters

**❌ "Failed to initialize sync service"**
- Check your internet connection
- Verify your Supabase project is active
- Check the Supabase dashboard for any errors

**❌ Database connection errors**
- Make sure you ran the SQL schema setup
- Check that your database password is correct
- Verify your project is not paused (free tier can pause after inactivity)

### Getting Help

1. **Check Supabase logs**: Go to your project → Logs
2. **Check React Native logs**: Look at your development console
3. **Verify environment variables**: Make sure they're loaded correctly

## Next Steps

Once everything is working:

1. **Test offline functionality** - Turn off your internet and make changes
2. **Test sync** - Turn internet back on and sync
3. **Add more data** - Create products and categories
4. **Test on multiple devices** - Install on another device and sync

## Free Tier Limits

Supabase free tier includes:
- 500MB database storage
- 50,000 monthly active users
- 5GB bandwidth
- 2GB file storage

This should be plenty for development and small-scale usage!

## Security Notes

- The `anon` key is safe to use in client-side code
- Row Level Security (RLS) is enabled on all tables
- For production, consider implementing proper authentication
- The current setup allows all operations - you may want to restrict this later

---

**🎉 Congratulations!** Your inventory app now has a cloud backend with automatic sync capabilities!
