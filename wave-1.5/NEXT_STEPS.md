# Next Steps - hCaptcha Setup

## ✅ What You've Done

1. Created hCaptcha site
2. Got your sitekey: `c3b6986a-e846-43b2-96fa-9170571e2a6e`
3. Frontend updated with your sitekey

## 🔄 Current Step: Generate Secret (Step 2)

Click the **"Generate Secret"** button in the hCaptcha dashboard.

**Why you need it:**
- The secret is used for backend verification (optional but recommended)
- It validates that CAPTCHA responses are legitimate
- You'll use it in your backend API if you want server-side verification

**Note:** For now, the frontend will work without the secret. The secret is mainly for backend validation if you want to add an extra layer of security.

## 📋 Remaining Steps

### 1. Generate Secret (Optional but Recommended)
- Click "Generate Secret" in hCaptcha dashboard
- Save the secret securely
- Add it to your backend `.env` file if you want server-side verification

### 2. Fund the Contract
Transfer tOmega tokens to:
```
0x02ed981450DC4a82C2C0257191e8789Ea232D223
```

### 3. Start Backend API
```powershell
cd wave-1.5
.\start-backend.ps1
```

Or manually:
```powershell
cd wave-1.5\backend
npm start
```

### 4. Test the System
1. Open `index.html` in a browser (or deploy it)
2. Try to claim - you should see the hCaptcha widget
3. Complete the CAPTCHA
4. Connect wallet and claim

### 5. Deploy Frontend
Upload `index.html` to your web hosting when ready.

## 🎉 You're Almost Done!

The frontend is now configured with your real hCaptcha key. The system is ready to use once you:
- Fund the contract with tOmega tokens
- Start the backend API (optional but recommended for full protection)

## 🔒 Backend Secret (Optional)

If you want to add server-side CAPTCHA verification to your backend, you can add this to `backend/server.js`:

```javascript
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET;

// Add endpoint to verify CAPTCHA
app.post('/api/verify-captcha', async (req, res) => {
  const { token } = req.body;
  // Verify with hCaptcha API
  // ... implementation
});
```

But this is optional - the frontend CAPTCHA will work without it!
