# 🎓 Course Bazar - Telegram Digital Course Selling Bot & Web Admin Dashboard

Welcome to **Course Bazar**! A complete, production-grade system built with **TypeScript**, **Telegraf**, **Express**, **React (Vite + Tailwind CSS)**, and **Google Sheets API** for selling password-protected digital courses with **manual UPI payment verification** and **Telegram-only screenshot routing**.

---

## 📌 1. How Course Bazar Works (The Simple System)

```
[Customer opens Telegram Bot]
           ↓
[Searches or Browses Courses]
           ↓
[Views Course Details (Title, Creator, Price, Size, Language)]
           ↓
[Clicks "🛒 BUY NOW"]
           ↓
[Bot displays personal UPI QR Code & UPI ID]
           ↓
[Customer pays exact amount via PhonePe / GPay / Paytm]
           ↓
[Customer clicks "✅ I HAVE PAID" & uploads Payment Screenshot]
           ↓
[Bot forwards screenshot instantly to Authorized Telegram Admin(s)]
[Bot records purchase as "PAYMENT_SUBMITTED" in Google Sheets]
           ↓
[Admin checks real Bank / UPI App to confirm payment received]
           ↓
   ┌──────────────────────────────────────────────┐
   │                                              │
[✅ Admin Clicks APPROVE]              [❌ Admin Clicks REJECT]
   │                                              │
[Updates Sheet status to PAID]         [Updates Sheet status to REJECTED]
[Sends Customer Google Drive Link]     [Sends polite rejection notice]
[Sends Secret ZIP Password]            [No course files or password sent]
```

### 🔒 Core Architecture Principles:
1. **Telegram-Only Payment Screenshots**: Payment screenshots sent by customers are forwarded directly to authorized admins via Telegram. They are **never** stored on the server, local project storage, database, or Google Sheets.
2. **No Order ID / UTR Required**: Purchases are verified strictly by `Telegram User ID` and `Course ID` / `Course Name`. Customers never need to type complex reference or transaction numbers.
3. **Manual Admin Verification**: Automated auto-verification can be fooled by fake screenshots. Admins verify receipt in their actual bank/UPI app before clicking **Approve**.
4. **Google Drive Delivery**: Large course ZIP files remain safely hosted on Google Drive. The bot delivers the Drive link and ZIP extraction password only after payment approval.
5. **Google Sheets Database**: Courses, purchases, admins, and settings are managed directly through Google Sheets. No external SQL database is required!

---

## 📑 2. Google Sheets Setup (The 4 Required Tabs)

Create a new Google Sheet named **Course Bazar Database** with these **exact 4 tab names**:

### Tab 1: `Courses`
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J | Col K | Col L | Col M |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Course ID** | **Course Name** | **Creator Name** | **Price** | **Original Price** | **Course Size** | **Language** | **Drive Link** | **ZIP Password** | **Description** | **Thumbnail URL** | **Status** | **Created At** |

- **Sample Row 2**: `C001` | `Storytelling Mastery` | `Zakir Khan` | `99` | `499` | `2.46 GB` | `Hindi` | `https://drive.google.com/drive/folders/your-folder-id` | `ZAKIR_PASS_2026` | `Complete masterclass on storytelling.` | `https://images.unsplash.com/...` | `Active` | `2026-10-07`

---

### Tab 2: `Purchases`
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Telegram User ID** | **Telegram Username** | **Customer Name** | **Course ID** | **Course Name** | **Amount** | **Status** | **Created At** | **Approved At** | **Approved By** |

*(Note: Payment screenshot file IDs or URLs are intentionally excluded from Google Sheets for privacy and security).*

---

### Tab 3: `Settings`
| Col A | Col B |
| :--- | :--- |
| **Key** | **Value** |

- **Sample Rows**:
  - `UPI_ID` | `yourname@upi`
  - `PAYEE_NAME` | `Course Bazar`
  - `SUPPORT_USERNAME` | `@your_support_handle`
  - `STORE_NAME` | `Course Bazar`
  - `CURRENCY` | `INR`
  - `PAYMENT_EXPIRY_HOURS` | `24`

---

### Tab 4: `Admins`
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin ID** | **Admin Name** | **Telegram User ID** | **Telegram Username** | **Role** | **Status** | **Added By** | **Created At** |

- **Sample Row 2**: `ADM-01` | `Owner` | `123456789` | `@owner_handle` | `Owner` | `Active` | `System` | `2026-10-07`

---

## 🤖 3. Telegram Bot Setup (BotFather)

1. Open Telegram and search for `@BotFather`.
2. Send `/start`, then send `/newbot`.
3. Choose a display name (e.g., `Course Bazar`) and a unique username ending in `bot` (e.g., `my_course_bazar_bot`).
4. Copy the HTTP API token provided by BotFather. This is your `BOT_TOKEN`.

---

## 🆔 4. How to Find Your Telegram User ID

1. Search for `@userinfobot` on Telegram and click **Start**.
2. Copy your numeric **Id** (e.g., `987654321`). This is your `ADMIN_TELEGRAM_ID`.

---

## ☁️ 5. Google Cloud & Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a New Project (e.g., `Course Bazar Bot`).
3. Enable the **Google Sheets API**.
4. Go to **IAM & Admin** → **Service Accounts** → **Create Service Account** (`course-bazar-sheets`).
5. Go to the **Keys** tab of the service account → **Add Key** → **Create new key** (JSON).
6. Download the JSON key file:
   - Copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - Copy `private_key` (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) → `GOOGLE_PRIVATE_KEY`
7. **Share your Google Sheet**:
   - Open your Google Sheet in your browser.
   - Click **Share** and add your service account email as an **Editor**.
8. **Get your Spreadsheet ID**:
   - From your Sheet URL: `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`
   - Copy the string between `/d/` and `/edit` → `GOOGLE_SHEET_ID`.

---

## 🖼️ 6. UPI QR Code Setup

1. Open your UPI app (PhonePe / GPay / Paytm), download/screenshot your QR code, and crop it to show only the QR code.
2. Save it inside the project folder as:
   ```text
   assets/qr-code.png
   ```

---

## 💻 7. Installation & Windows Setup Guide

### Step 1: Install Node.js
Download and install Node.js LTS (v20 or v22) from [nodejs.org](https://nodejs.org/).

### Step 2: Clone / Open Project & Install Dependencies
Open Command Prompt or PowerShell in the project directory:
```cmd
npm install
```

### Step 3: Configure `.env`
Copy `.env.example` to `.env` and fill in your credentials:
```env
BOT_TOKEN=your_bot_token_from_botfather
GOOGLE_SHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_TELEGRAM_ID=your_numeric_telegram_id
UPI_ID=yourname@upi
PAYEE_NAME=Course Bazar
SUPPORT_USERNAME=@your_support_handle
QR_IMAGE_PATH=./assets/qr-code.png
PAYMENT_EXPIRY_HOURS=24
STORE_NAME=Course Bazar
CURRENCY=₹
PORT=3000
```

### Step 4: Run the Application
- **Run Telegram Bot only:**
  ```cmd
  npm run bot
  ```
- **Run Web Admin Dashboard & Bot simultaneously:**
  ```cmd
  npm run dev
  ```
  *(Then open `http://localhost:3000` in your browser)*

- **Build for Production:**
  ```cmd
  npm run build
  npm start
  ```

- **Run Tests:**
  ```cmd
  npm test
  ```

---

## 🚀 8. Deployment & Always-On Hosting

- **Render.com / Railway.app / VPS**:
  - Build Command: `npm install && npm run build`
  - Start Command: `node dist/server.js` (or `npm run bot`)
  - Set all environment variables from `.env` in your host's dashboard settings.

---

## ❓ 9. Troubleshooting & FAQ

- **Error: `401 Unauthorized`**: Check `BOT_TOKEN` in `.env`.
- **Error: `The caller does not have permission`**: Share your Google Sheet with your service account email as **Editor**.
- **Error: `Requested entity was not found`**: Verify `GOOGLE_SHEET_ID` and ensure sheet tabs are named `Courses`, `Purchases`, `Settings`, `Admins`.
