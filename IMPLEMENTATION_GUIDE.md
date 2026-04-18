# Chatgram - Complete Implementation Guide

## 🎯 Architecture Overview

Chatgram is built with a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│  React Components  │  Contexts  │  Hooks  │  Services       │
├─────────────────────────────────────────────────────────────┤
│                      WebRTC (P2P Voice)                      │
├─────────────────────────────────────────────────────────────┤
│  Firebase Firestore (Signaling) │ Cloudinary (Media)        │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Installation Steps

### 1. Install Dependencies

```bash
cd chatgram
npm install
```

### 2. Environment Setup

Create `.env.local` in the root:

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

### 3. Firebase Setup

#### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

#### Enable Required Services

1. **Authentication**: Enable Email/Password in Firebase Console
2. **Firestore**: Create database in production mode
3. **Cloud Messaging**: Enable for push notifications

### 4. Cloudinary Setup

1. Create upload preset named `chatgram_avatars`
2. Set it to **unsigned** for client-side uploads
3. Configure transformations:
   - Quality: Auto
   - Format: Auto
   - Enable folder organization

## 🏗️ Project Structure Deep Dive

### Core Components

#### 1. **ChatInterface.tsx** - Main Chat Component
- Real-time message loading with Firestore
- Optimistic UI updates for instant feedback
- Typing indicators with debouncing
- Read receipts and message status
- Reply threading and reactions
- Pinned messages support

#### 2. **VoiceCallContext.tsx** - WebRTC Voice Calling
- **Signaling**: Firebase Firestore for SDP exchange
- **ICE Candidates**: Automatic gathering and exchange
- **Audio Processing**: Echo cancellation, noise suppression
- **Connection States**: Calling, ringing, connected, ended

**Call Flow:**
```
Caller                    Firestore                    Receiver
  │                          │                            │
  ├─ Create Call Doc ────────>                           │
  │                          │                            │
  ├─ Save Offer ─────────────>                           │
  │                          │                            │
  │                          ├─ Listen for Call ─────────>│
  │                          │                            │
  │                          <──── Save Answer ──────────┤
  │                          │                            │
  ├─ ICE Candidates ─────────>──── ICE Candidates ──────>│
  │                          │                            │
  ╞════════════ CONNECTED ═══════════════════════════════╡
```

#### 3. **CloudinaryService.ts** - Media Optimization
- **Automatic Compression**: Quality: auto, Format: auto
- **Blur Placeholders**: LQIP (Low Quality Image Placeholders)
- **Progress Tracking**: Real-time upload progress
- **Type Detection**: Image, video, audio, file

**Optimization Pipeline:**
```
File Upload
    ↓
Type Detection
    ↓
Cloudinary Upload (with transformations)
    ↓
Generate Thumbnail (videos)
    ↓
Create Blur Placeholder (images)
    ↓
Return Optimized URLs
```

## 🔥 Key Features Implementation

### 1. Optimistic UI Updates

```typescript
// Send message optimistically
const optimisticMessage = {
  id: `temp_${Date.now()}`,
  ...messageData,
  timestamp: Timestamp.now(),
};

// Add to UI immediately
setMessages(prev => [...prev, optimisticMessage]);

// Then save to Firestore
await addDoc(collection(db, 'messages'), messageData);
```

### 2. Real-Time Typing Indicators

```typescript
// Throttled updates (max every 2 seconds)
const sendTypingIndicator = () => {
  const now = Date.now();
  if (now - lastUpdate < 2000) return;
  
  setDoc(doc(db, 'typing', `${roomId}_${userId}`), {
    roomId,
    userId,
    userName,
    timestamp: serverTimestamp(),
  });
  
  // Auto-clear after 3 seconds
  setTimeout(() => {
    deleteDoc(doc(db, 'typing', `${roomId}_${userId}`));
  }, 3000);
};
```

### 3. Read Receipts

```typescript
// Mark as read when message enters viewport
const messageRef = doc(db, 'messages', messageId);
await updateDoc(messageRef, {
  readBy: arrayUnion(currentUserId),
});

// Display: ✓ (sent), ✓✓ (read)
```

### 4. Link Preview Generation

```typescript
// Extract URLs from message text
const urls = text.match(URL_REGEX);

if (urls) {
  // Fetch metadata (use a service like link-preview-js)
  const preview = await fetchLinkPreview(urls[0]);
  
  messageData.linkPreview = {
    url: urls[0],
    title: preview.title,
    description: preview.description,
    image: preview.image,
  };
}
```

## 🎨 UI/UX Best Practices

### Glassmorphism Design

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Mobile-First Responsive Design

```typescript
// Hide sidebar on mobile when chat is open
const [isSidebarOpen, setIsSidebarOpen] = useState(true);

// On mobile, close sidebar when chat opens
useEffect(() => {
  if (window.innerWidth < 1024 && selectedRoom) {
    setIsSidebarOpen(false);
  }
}, [selectedRoom]);
```

## 🔒 Security Best Practices

### 1. Firestore Rules Validation
- Users can only read/write their own data
- Room access is restricted to participants
- Messages require room membership

### 2. Input Sanitization
```typescript
// Sanitize user input
const sanitizedText = text
  .trim()
  .replace(/<script>/gi, '')
  .slice(0, 5000); // Max length
```

### 3. Rate Limiting
```typescript
// Limit typing indicators to prevent spam
const TYPING_THROTTLE = 2000; // 2 seconds
```

## 📱 PWA Configuration

### Service Worker Registration

Add to `app/layout.tsx`:

```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      });
  }
}, []);
```

### Push Notifications Setup

```typescript
import { getMessaging, getToken } from 'firebase/messaging';

const requestNotificationPermission = async () => {
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY',
    });
    
    // Save token to user document
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: token,
    });
  }
};
```

## 🚀 Performance Optimizations

### 1. Lazy Loading Messages
```typescript
const loadMoreMessages = async () => {
  const lastMessage = messages[0];
  
  const moreMessages = await getDocs(
    query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('timestamp', 'desc'),
      startAfter(lastMessage.timestamp),
      limit(20)
    )
  );
};
```

### 2. Image Optimization
```typescript
// Use Cloudinary transformations
const optimizedUrl = cloudinaryService.getOptimizedImageUrl(publicId, {
  width: 800,
  height: 600,
  crop: 'fill',
  quality: 'auto',
  format: 'auto',
});
```

### 3. Debounced Search
```typescript
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

## 🧪 Testing Checklist

- [ ] User registration and login
- [ ] Create direct message
- [ ] Send text messages
- [ ] Upload and view images
- [ ] Upload and play videos
- [ ] Record and play audio
- [ ] Voice calling (offer/answer/ICE)
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message reactions
- [ ] Reply to messages
- [ ] Edit messages
- [ ] Delete messages
- [ ] Pin messages
- [ ] Global search (users and messages)
- [ ] PWA installation
- [ ] Push notifications
- [ ] Offline mode

## 🐛 Common Issues & Solutions

### Issue: WebRTC Connection Fails
**Solution**: Check STUN/TURN server configuration. For production, use a TURN server:

```typescript
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

### Issue: Images Not Loading
**Solution**: Verify Cloudinary CORS settings and upload preset permissions.

### Issue: Messages Not Syncing
**Solution**: Check Firestore rules and ensure user is authenticated.

## 📈 Scaling Considerations

### 1. Message Pagination
Implement infinite scroll with Firestore cursors

### 2. Media Storage
Consider Cloudinary's storage limits and implement cleanup

### 3. WebRTC for Groups
Use a media server (like Janus or Jitsi) for group calls

### 4. Caching Strategy
Implement Redis for frequently accessed data

## 🎉 Next Steps

1. Add group chat creation UI
2. Implement message forwarding
3. Add file preview for PDFs/docs
4. Voice message recording
5. End-to-end encryption (using Web Crypto API)
6. Video calling support
7. Screen sharing
8. Message search within chat
9. User blocking/reporting
10. Admin dashboard

## 📚 Additional Resources

- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [WebRTC Documentation](https://webrtc.org/getting-started/overview)
- [Cloudinary Docs](https://cloudinary.com/documentation)
- [Next.js Documentation](https://nextjs.org/docs)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

---

Built with ❤️ using React, Firebase, and Cloudinary
