# 🚀 Chatgram Quick Start & Deployment Guide

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd chatgram
npm install
```

### 2. Create Environment File
Create `.env.local` in root:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDJaakTx2GIpIByg3g33hARlM4uWoE-jg8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chatgram-40134.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chatgram-40134
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chatgram-40134.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=369091063466
NEXT_PUBLIC_FIREBASE_APP_ID=1:369091063466:web:29cf0f25b9f71f57ccaad3

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=ddlebpv42
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=chatgram_avatars
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔥 Firebase Setup

### Deploy Firestore Rules
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Deploy security rules
firebase deploy --only firestore:rules
```

### Enable Firebase Services

1. **Authentication**
   - Go to Firebase Console → Authentication
   - Enable Email/Password sign-in method

2. **Firestore Database**
   - Go to Firestore Database
   - Create database in production mode
   - Location: Choose nearest to your users

3. **Cloud Messaging (Optional - for push notifications)**
   - Go to Cloud Messaging
   - Generate VAPID key pair
   - Add to your environment variables

## ☁️ Cloudinary Setup

1. **Create Upload Preset**
   - Go to Settings → Upload
   - Add upload preset named: `chatgram_avatars`
   - Signing Mode: **Unsigned**
   - Folder: `chatgram`

2. **Configure Transformations**
   - Quality: `Auto`
   - Format: `Auto`
   - Enable automatic format selection

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Option 2: Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t chatgram .
docker run -p 3000:3000 chatgram
```

## 🧪 Testing the Features

### 1. Authentication
- Sign up with email/password
- Sign in
- Check user profile in sidebar

### 2. Messaging
- Create a new chat
- Send text messages
- Upload images/videos
- Add reactions to messages
- Reply to messages
- Edit/delete messages
- Pin important messages

### 3. Voice Calling
- Click phone icon in chat header
- Accept/decline incoming calls
- Test mute/unmute
- Check audio visualization

### 4. Search
- Click search icon
- Search for users
- Search for messages across all chats

### 5. PWA Features
- Install app on mobile (Add to Home Screen)
- Test offline mode
- Check push notifications (if configured)

## 🐛 Troubleshooting

### WebRTC Not Connecting
```typescript
// Add TURN server for production in VoiceCallContext.tsx
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password',
    },
  ],
};
```

### Images Not Loading
- Check Cloudinary CORS settings
- Verify upload preset is unsigned
- Check browser console for errors

### Build Errors
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

### Firestore Permission Errors
- Deploy firestore.rules
- Check user authentication status
- Verify security rules match your data structure

## 📊 Performance Optimization

### 1. Enable Image Optimization
Already configured in `next.config.js`

### 2. Code Splitting
Next.js does this automatically

### 3. Lazy Loading
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
});
```

### 4. Database Indexing
Create Firestore indexes:
- Collection: `messages`
  - Fields: `roomId` (Ascending), `timestamp` (Descending)
- Collection: `rooms`
  - Fields: `participants` (Array), `lastMessage.timestamp` (Descending)

## 🔒 Security Best Practices

### 1. Environment Variables
Never commit `.env.local` to git

### 2. API Keys
Use Firebase App Check for production:
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true,
});
```

### 3. Rate Limiting
Implement Cloud Functions for rate limiting:
```javascript
// functions/index.js
exports.checkRateLimit = functions.https.onCall(async (data, context) => {
  // Implement rate limiting logic
});
```

## 📈 Monitoring & Analytics

### Firebase Analytics
```typescript
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics(app);
logEvent(analytics, 'message_sent');
```

### Error Tracking
```bash
npm install @sentry/nextjs
```

## 🎨 Customization

### Change Theme Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    500: '#your-color',
    600: '#your-color',
  },
}
```

### Add New Features
1. Create component in `src/components`
2. Add types to `src/types/index.ts`
3. Implement business logic in `src/services`
4. Update Firestore rules if needed

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [WebRTC Guide](https://webrtc.org/getting-started)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🆘 Support

For issues, please check:
1. Console logs in browser DevTools
2. Firebase Console for errors
3. Network tab for failed requests
4. Firestore rules simulator

## 🎉 Success!

You now have a fully functional, production-ready messaging platform!

### Next Steps:
- [ ] Add group chat functionality
- [ ] Implement end-to-end encryption
- [ ] Add video calling support
- [ ] Create admin dashboard
- [ ] Implement message forwarding
- [ ] Add user blocking
- [ ] Create mobile apps (React Native)

---

Built with ❤️ - Happy Coding!
