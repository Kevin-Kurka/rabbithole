# Google OAuth Setup Instructions

## Quick Start

The authentication system is now configured with Google OAuth support. To enable it:

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - Application name: `Rabbit Hole`
   - User support email: your email
   - Developer contact: your email
6. For Application type, select **Web application**
7. Add authorized redirect URI:
   ```
   http://localhost:3001/api/auth/callback/google
   ```
8. Click **Create**
9. Copy your **Client ID** and **Client Secret**

### 2. Configure Environment Variables

Update `/frontend/.env.local` with your credentials:

```env
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your-actual-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

**Important**: Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Restart the Application

```bash
cd frontend
npm run dev
```

## What's Implemented

✅ **Demo Login Button** - One-click login with test@example.com/test
✅ **Google OAuth** - Sign in with Google account
✅ **Email/Password Login** - Traditional credentials login
✅ **User Registration** - Create new account with validation
✅ **Forgot Password UI** - Password reset flow (backend TODO)
✅ **Error Handling** - User-friendly error messages
✅ **Loading States** - Disabled buttons during authentication

## Authentication Flow

### Demo Login
1. Click "🚀 Try Demo" button
2. Automatically signs in as test@example.com
3. Redirects to `/graph`

### Google OAuth
1. Click "Sign in with Google"
2. Redirects to Google consent screen
3. User approves
4. Returns to app at `/api/auth/callback/google`
5. NextAuth creates session
6. Redirects to `/graph`

### Email/Password
1. Enter email and password
2. Calls GraphQL `login` mutation
3. Backend validates with bcrypt
4. Returns user object
5. NextAuth creates session
6. Redirects to `/graph`

### Registration
1. Fill form (username, email, password, confirm)
2. Client-side validation
3. Calls GraphQL `register` mutation
4. Backend hashes password with bcrypt
5. Auto-login after successful registration
6. Redirects to `/graph`

## Testing

### Without Google OAuth
You can test immediately using:
- **Demo button**: Instant access
- **Email/Password**: test@example.com / test

### With Google OAuth
After adding credentials to `.env.local`:
1. Restart frontend server
2. Click "Sign in with Google"
3. Use your Google account

## Security Notes

- ✅ `.env.local` is gitignored
- ✅ `.env.example` provided for reference
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ NEXTAUTH_SECRET required in production
- ⚠️ Change NEXTAUTH_SECRET before deploying
- ⚠️ Use HTTPS in production

## Troubleshooting

**Error: "Missing NEXTAUTH_SECRET"**
- Add `NEXTAUTH_SECRET` to `.env.local`
- Generate with: `openssl rand -base64 32`

**Error: "Redirect URI mismatch"**
- Verify redirect URI in Google Console exactly matches:
  `http://localhost:3001/api/auth/callback/google`

**Google button doesn't work**
- Check `.env.local` has valid GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Restart the dev server after adding env vars

**Demo login fails**
- Ensure test user exists in database
- Check backend GraphQL server is running (port 4000)
- Verify backend can connect to PostgreSQL
