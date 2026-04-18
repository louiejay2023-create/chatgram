# Chatgram - Professional Real-Time Messaging Platform

A high-performance, feature-rich messaging application built with Next.js, Firebase, and Cloudinary.

## 🚀 Features

- **Real-Time Messaging**: Instant message delivery with Firestore
- **Voice Calling**: WebRTC-powered P2P voice calls with Firebase signaling
- **Cloud Media**: Optimized image/video handling via Cloudinary
- **Advanced Chat**: Typing indicators, read receipts, reactions, replies, pinned messages
- **Global Search**: Instant user and message discovery
- **PWA Support**: Installable with offline mode and push notifications
- **Responsive Design**: Mobile-first with glassmorphism UI

## 📁 Project Structure

```
chatgram/
├── src/
│   ├── app/                    # Next.js 14 app directory
│   ├── components/             # React components
│   │   ├── chat/              # Chat-related components
│   │   ├── voice/             # Voice call components
│   │   ├── media/             # Media players & uploaders
│   │   └── ui/                # Reusable UI components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Business logic & API services
│   ├── lib/                   # Utilities & configurations
│   └── types/                 # TypeScript definitions
├── public/
│   ├── manifest.json          # PWA manifest
│   └── service-worker.js      # Service worker for offline mode
└── firestore.rules            # Firestore security rules
```

## 🔧 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with glassmorphism
- **Backend**: Firebase (Auth, Firestore, Cloud Messaging)
- **Media**: Cloudinary (compression, optimization)
- **Voice**: WebRTC with Firebase signaling
- **State**: React Context + Custom Hooks

## 📦 Installation

```bash
npm install next@latest react@latest react-dom@latest
npm install firebase
npm install tailwindcss postcss autoprefixer
npm install cloudinary
npm install date-fns zustand
npm install lucide-react
npm install @headlessui/react
```

## 🔐 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

## 🚦 Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📱 PWA Setup

The app is installable on mobile and desktop. Service workers enable offline message viewing and push notifications.

## 🔒 Security

Firestore security rules ensure users can only access their own data and rooms they belong to.
