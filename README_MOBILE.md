# 📱 Run SJDA App on Your Mobile Phone

## 🚀 Quick Start (3 Steps)

### Step 1: Start Server with Network Access

```bash
npm run dev:network
```

This makes your app accessible from your phone on the same WiFi network.

---

### Step 2: Find Your IP Address

**Windows:**
```bash
ipconfig
```
Look for **IPv4 Address** (e.g., `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
```
Look for your local IP (usually `192.168.x.x`)

---

### Step 3: Open on Your Phone

1. Make sure phone is on **same WiFi** as computer
2. Open browser on phone
3. Go to: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`
4. Login and use the app! 🎉

---

## 📲 Install as App (PWA)

After opening in browser:

**Android:**
- Chrome menu (3 dots) → "Add to Home screen"

**iPhone:**
- Safari Share button → "Add to Home Screen"

---

## ✅ What's Already Set Up

- ✅ PWA Manifest
- ✅ Service Worker (offline support)
- ✅ Mobile viewport
- ✅ Mobile-optimized layout

---

## 🎯 You're Ready!

Your app is now mobile-ready! Just follow the 3 steps above.

