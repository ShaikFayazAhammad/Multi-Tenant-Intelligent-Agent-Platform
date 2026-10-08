# Vite Configuration Guide - Environment-Based URLs

The Vite configuration has been updated to read all URLs from environment variables, making it fully configurable for different environments without code changes.

---

## 🎯 Environment Variables

### **Vite Dev Server Configuration**

| Variable | Description | Development | Staging | Production |
|----------|-------------|-------------|---------|------------|
| `VITE_SERVER_HOST` | Dev server host | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` |
| `VITE_SERVER_PORT` | Dev server port | `3000` | `8148` | `8148` |
| `VITE_PREVIEW_PORT` | Preview server port | `4173` | `8149` | `8149` |

### **Backend URLs (for Vite Proxy)**

| Variable | Description | Development | Staging |
|----------|-------------|-------------|---------|
| `VITE_BACKEND_URL` | Backend HTTP URL | `http://localhost:8000` | `https://vms2.0.haloocom.in` (from 192.168.3.155:8147) |
| `VITE_BACKEND_WS_URL` | Backend WebSocket URL | `ws://localhost:8000` | `wss://vms2.0.haloocom.in` (from 192.168.3.155:8147) |

**Note:** These are used by Vite's dev server proxy only. Not used in production builds.

### **Application URLs (Runtime)**

| Variable | Description | Development | Staging | Production |
|----------|-------------|-------------|---------|------------|
| `VITE_OIDC_AUTHORITY` | OIDC provider URL | `http://localhost:5000` | `https://vms2.0.haloocom.in/oidc` (from 192.168.3.155:8146) | `https://hexaweb.haloocom.in` |
| `VITE_WS_URL` | WebSocket endpoint | `ws://localhost:8000/ws` | `wss://vms2.0.haloocom.in/ws` (from 192.168.3.155:8147) | `wss://hexaweb.haloocom.in/ws` |
| `VITE_FLOOR_MAP_URL` | Floor map server URL | `http://localhost:8003` | `https://vms2.0.haloocom.in/floor` (from 192.168.3.155:8144) | `https://hexaweb.haloocom.in/floor` |

### **Application Settings**

| Variable | Description | Development | Staging | Production |
|----------|-------------|-------------|---------|------------|
| `VITE_USE_MOCK` | Use mock transport | `false` | `false` | `false` |
| `VITE_DEBUG` | Enable debug logging | `true` | `true` | `false` |

---

## 📁 Environment Files

### **Development** (`.env.development`)
```env
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=3000
VITE_PREVIEW_PORT=4173

VITE_BACKEND_URL=http://localhost:8000
VITE_BACKEND_WS_URL=ws://localhost:8000

VITE_OIDC_AUTHORITY=http://localhost:5000
VITE_WS_URL=ws://localhost:8000/ws
VITE_FLOOR_MAP_URL=http://localhost:8003

VITE_USE_MOCK=false
VITE_DEBUG=true
```

### **Staging** (`.env.staging`)

Mapped to `https://vms2.0.haloocom.in`. Original internal: 192.168.3.155:8144-8148.

```env
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=8148          # 192.168.3.155:8148
VITE_PREVIEW_PORT=8149

VITE_BACKEND_URL=https://vms2.0.haloocom.in           # from 192.168.3.155:8147
VITE_BACKEND_WS_URL=wss://vms2.0.haloocom.in           # from 192.168.3.155:8147

VITE_OIDC_AUTHORITY=https://vms2.0.haloocom.in/oidc    # from 192.168.3.155:8146
VITE_WS_URL=wss://vms2.0.haloocom.in/ws                # from 192.168.3.155:8147
VITE_FLOOR_MAP_URL=https://vms2.0.haloocom.in/floor    # from 192.168.3.155:8144

VITE_USE_MOCK=false
VITE_DEBUG=true
```

### **Production** (`.env.production`)
```env
VITE_SERVER_HOST=0.0.0.0
VITE_SERVER_PORT=8148
VITE_PREVIEW_PORT=8149

VITE_BACKEND_URL=https://hexaweb.haloocom.in
VITE_BACKEND_WS_URL=wss://hexaweb.haloocom.in

VITE_OIDC_AUTHORITY=https://hexaweb.haloocom.in
VITE_WS_URL=wss://hexaweb.haloocom.in/ws
VITE_FLOOR_MAP_URL=https://hexaweb.haloocom.in/floor

VITE_USE_MOCK=false
VITE_DEBUG=false
```

---

## 🚀 Usage

### **1. Setup Environment Files**

```bash
cd frontend

# For Development
cp env.development.template .env.development

# For Staging
cp env.staging.template .env.staging

# For Production
cp env.production.template .env.production
```

### **2. Run in Different Modes**

```bash
# Development mode (uses .env.development)
npm run dev

# Staging mode (uses .env.staging)
npm run dev -- --mode staging

# Production build (uses .env.production)
npm run build

# Preview production build (uses .env.production)
npm run preview
```

---

## 🔧 How It Works

### **Vite Config Changes**

The `vite.config.ts` now:

1. **Loads environment variables** based on mode:
   ```typescript
   const env = loadEnv(mode, process.cwd(), '')
   ```

2. **Reads backend URLs** from environment:
   ```typescript
   const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8000'
   const wsUrl = env.VITE_BACKEND_WS_URL || 'ws://localhost:8000'
   ```

3. **Configures proxy dynamically**:
   ```typescript
   proxy: {
     '/ws': {
       target: wsUrl,  // From environment
       ws: true,
       changeOrigin: true,
     },
     '/api': {
       target: backendUrl,  // From environment
       changeOrigin: true,
     },
   }
   ```

4. **Configures server settings**:
   ```typescript
   server: {
     host: env.VITE_SERVER_HOST || '0.0.0.0',
     port: parseInt(env.VITE_SERVER_PORT || '3000'),
   }
   ```

---

## 📊 Configuration Flow

```
┌─────────────────────┐
│  .env.development   │
│  .env.staging       │  ──→  Vite loads based on --mode
│  .env.production    │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   vite.config.ts    │  ──→  Reads env variables
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Dev Server Config  │  ──→  Proxy, host, port
│  Build Config       │  ──→  Output, sourcemap
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   Application       │  ──→  Runtime env vars (VITE_*)
└─────────────────────┘
```

---

## ✅ Verification

### **Check Loaded Configuration**

When you start the dev server, you'll see:
```
[Vite Config] Mode: development
[Vite Config] Backend URL: http://localhost:8000
[Vite Config] WebSocket URL: ws://localhost:8000
```

### **Verify in Browser Console**

```javascript
// Check runtime environment variables
console.log(import.meta.env.VITE_OIDC_AUTHORITY)
console.log(import.meta.env.VITE_WS_URL)
console.log(import.meta.env.VITE_FLOOR_MAP_URL)
```

---

## 🔍 Troubleshooting

### **Issue: Environment Variables Not Loading**

**Check 1: File exists**
```bash
ls -la frontend/.env.development
ls -la frontend/.env.staging
ls -la frontend/.env.production
```

**Check 2: Correct mode**
```bash
# For staging, must specify --mode
npm run dev -- --mode staging

# Default is development
npm run dev
```

**Check 3: Restart dev server**
Environment changes require restart:
```bash
# Stop (Ctrl+C) and restart
npm run dev
```

### **Issue: Wrong URLs Being Used**

**Check:** Verify which .env file is being used:
```bash
# Check current mode
npm run dev -- --mode staging

# Console will show:
# [Vite Config] Mode: staging
```

### **Issue: Proxy Not Working**

**Check:** Proxy only works in dev mode, not in production build:
- ✅ `npm run dev` - Proxy works
- ❌ `npm run build` - Proxy not used (direct URLs)

---

## 📝 Environment File Priority

Vite loads environment files in this order (later overrides earlier):

1. `.env` - All modes
2. `.env.local` - All modes (ignored by git)
3. `.env.[mode]` - Specific mode (e.g., `.env.development`)
4. `.env.[mode].local` - Specific mode, local (ignored by git)

**Example:**
```
.env                    # Base config
.env.development        # Development overrides
.env.development.local  # Local development overrides (not in git)
```

---

## 🎯 Best Practices

1. **Never commit `.env.local` files** - Add to `.gitignore`
2. **Use templates** - Commit `.env.*.template` files
3. **Document variables** - Add comments in template files
4. **Validate on startup** - Check required variables exist
5. **Use different ports** - Avoid conflicts between environments

---

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vite Config Reference](https://vitejs.dev/config/)
- [Vite Server Options](https://vitejs.dev/config/server-options.html)

---

## Summary

All URLs and configuration are now controlled by environment variables:

- ✅ **No hardcoded URLs** in `vite.config.ts`
- ✅ **Environment-specific** configuration files
- ✅ **Easy switching** between environments
- ✅ **Consistent** across development, staging, and production
- ✅ **Fallback defaults** if variables not set

Simply copy the appropriate template, update the URLs, and run with the correct mode!

