# 🎓 Course Bazar - Telegram Digital Course Selling Bot

Welcome to **Course Bazar**! This is a complete, production-grade Telegram bot system built with **TypeScript**, **Telegraf**, and **Google Sheets API** for selling password-protected digital courses with **manual UPI verification**.

> **Designed for Beginners**: You do **not** need prior coding experience. Follow the step-by-step instructions below.

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
[Bot displays your personal UPI QR Code & UPI ID]
           ↓
[Customer pays manually via PhonePe / GPay / Paytm]
           ↓
[Customer clicks "✅ I HAVE PAID" & uploads Payment Screenshot]
           ↓
[Bot saves purchase as "PAYMENT_SUBMITTED" in Google Sheets]
           ↓
[Admin receives Instant Telegram Alert with the Screenshot + Buttons]
           ↓
[Admin checks their real Bank / UPI App to confirm money received]
           ↓
   ┌──────────────────────────────────────────────┐
   │                                              │
[✅ Admin Clicks APPROVE]              [❌ Admin Clicks REJECT]
   │                                              │
[Bot updates status to PAID]           [Bot updates status to REJECTED]
[Sends Customer Google Drive link]     [Sends polite rejection notice]
[Sends Secret ZIP Password]            [No course files or password sent]
```

### 🔒 Very Important Principles:
1. **NO Order ID, NO UTR, NO Transaction ID**: Customers never have to type complex reference numbers. The system tracks purchases by `Telegram User ID`, `Telegram Username`, `Course ID`, `Amount`, and `Payment Screenshot`.
2. **Manual Admin Verification**: The bot does **not** pretend to verify payments automatically. Screenshots can be edited or fake. You (the admin) verify in your actual bank app before clicking **Approve**.
3. **No Heavy File Downloads**: Course ZIP files remain on Google Drive. The bot never downloads gigabytes of files; it delivers the Google Drive link and ZIP extraction password only after payment approval.
4. **Google Sheets is Your Database**: Add or update courses directly in Google Sheets. No database software (Postgres, Mongo, Firebase) required!

---

## 📑 2. Google Sheets Setup (The 4 Tabs)

Create a new Google Sheet named **Course Bazar Database** with these **exact 4 tabs** (names must match exactly):

### Tab 1: `Courses`
Create these column headers in Row 1:
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J | Col K | Col L | Col M |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Course ID** | **Course Name** | **Creator Name** | **Price** | **Original Price** | **Course Size** | **Language** | **Drive Link** | **ZIP Password** | **Description** | **Thumbnail URL** | **Status** | **Created At** |

**Sample Row 2:**
- `Course ID`: `C001`
- `Course Name`: `Storytelling Mastery`
- `Creator Name`: `Zakir Khan`
- `Price`: `99`
- `Original Price`: `499`
- `Course Size`: `2.46 GB`
- `Language`: `Hindi`
- `Drive Link`: `https://drive.google.com/drive/folders/your-folder-id`
- `ZIP Password`: `ZAKIR_STORY_PASS_2026`
- `Description`: `Complete masterclass on storytelling and stage presence.`
- `Thumbnail URL`: `https://images.unsplash.com/photo-1478737270239-2f02b77fc618` *(optional)*
- `Status`: `Active` *(use `Active` to show, `Inactive` to hide)*
- `Created At`: `2026-10-07`

---

### Tab 2: `Purchases`
Create these column headers in Row 1:
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J | Col K |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Telegram User ID** | **Telegram Username** | **Customer Name** | **Course ID** | **Course Name** | **Amount** | **Payment Screenshot File ID** | **Status** | **Created At** | **Approved At** | **Approved By** |

*The bot will automatically append rows here when customers upload screenshots.*

---

### Tab 3: `Settings`
Create these column headers in Row 1:
| Col A | Col B |
| :--- | :--- |
| **Key** | **Value** |

**Sample Rows:**
- `UPI_ID` | `yourname@upi`
- `PAYEE_NAME` | `Course Bazar`
- `SUPPORT_USERNAME` | `@your_support_handle`
- `STORE_NAME` | `Course Bazar`
- `CURRENCY` | `INR`
- `PAYMENT_EXPIRY_HOURS` | `24`

---

### Tab 4: `Admins`
Create these column headers in Row 1:
| Col A | Col B | Col C | Col D |
| :--- | :--- | :--- | :--- |
| **Telegram ID** | **Name** | **Role** | **Status** |

**Sample Row 2:**
- `123456789` | `Owner` | `Owner` | `Active`

---

## 🤖 3. Telegram Bot Setup (BotFather)

1. Open Telegram on your phone or PC.
2. In the search bar, search for `@BotFather` (verify the blue checkmark).
3. Click **Start** or send:
   ```text
   /start
   ```
4. Send:
   ```text
   /newbot
   ```
5. BotFather asks: *"Alright, a new bot. How are we going to call it?"*
   Type your bot display name:
   ```text
   Course Bazar
   ```
6. BotFather asks: *"Good. Now let's choose a username for your bot. It must end in `bot`."*
   Type a unique username, for example:
   ```text
   my_course_bazar_bot
   ```
7. BotFather replies with your token:
   ```text
   Use this token to access the HTTP API:
   1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   ```
8. **Copy this token!** This is your `BOT_TOKEN`. Keep it private.

---

## 🆔 4. How to Find Your Telegram User ID

1. In Telegram, search for `@userinfobot`.
2. Click **Start**.
3. It will immediately reply with your details:
   ```text
   Id: 987654321
   First: John
   Username: @john
   ```
4. Copy the number next to **Id**.
5. This number is your `ADMIN_TELEGRAM_ID`.

---

## ☁️ 5. Google Cloud & Service Account Setup

To allow your bot to read and write to your Google Sheet without asking you to log in every time, we create a free **Google Cloud Service Account**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. Click the Project dropdown at the top left → **New Project**.
4. Project Name: `Course Bazar Bot` → Click **Create**.
5. In the top search bar, search for **Google Sheets API** → Click **Enable**.
6. In the left menu, go to **IAM & Admin** → **Service Accounts**.
7. Click **+ Create Service Account**:
   - Service account name: `course-bazar-sheets`
   - Click **Create and Continue**, then click **Done**.
8. Click on the email of the service account you just created (looks like `course-bazar-sheets@project-name.iam.gserviceaccount.com`).
9. Go to the **Keys** tab → Click **Add Key** → **Create new key** → Choose **JSON** → Click **Create**.
10. A `.json` file downloads to your computer. Open this file in Notepad:
    - Copy the `client_email` value → this is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
    - Copy the `private_key` value (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) → this is your `GOOGLE_PRIVATE_KEY`.
11. **CRUCIAL STEP - Share your Google Sheet**:
    - Open your Google Sheet in your browser.
    - Click the blue **Share** button at the top right.
    - Paste your service account email (`course-bazar-sheets@...iam.gserviceaccount.com`).
    - Set the permission to **Editor**.
    - Uncheck "Notify people", then click **Share**.
12. **Get your Spreadsheet ID**:
    - Look at your Google Sheet URL:
      `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
    - The ID is the long code between `/d/` and `/edit`:
      `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
    - This is your `GOOGLE_SHEET_ID`.

---

## 🖼️ 6. UPI QR Code Setup

1. Open your UPI app (PhonePe, Google Pay, or Paytm).
2. Go to your Profile → View QR Code → Download/Screenshot your QR code.
3. Crop the image to show only the QR code.
4. Save the image inside your project folder as:
   ```text
   assets/qr-code.png
   ```

---

## 💻 7. Windows Setup Guide (Step-by-Step for Beginners)

### Step 1: Install Node.js
1. Go to [https://nodejs.org/](https://nodejs.org/).
2. Download the **LTS (Recommended for Most Users)** version (v20 or v22).
3. Run the downloaded installer and click **Next** through all steps.
4. Open **Command Prompt** (press Windows Key + R, type `cmd`, press Enter).
5. Verify Node.js is installed by typing:
   ```cmd
   node -v
   npm -v
   ```
   *You should see version numbers like `v20.x.x` and `10.x.x`.*

### Step 2: Open Project Folder
1. Open PowerShell or Command Prompt in your project directory:
   ```cmd
   cd path\to\course-bazar-bot
   ```

### Step 3: Install Dependencies
Run:
```cmd
npm install
```

### Step 4: Configure `.env`
1. Make a copy of `.env.example` named `.env`:
   ```cmd
   copy .env.example .env
   ```
2. Open `.env` in Notepad or VS Code and fill in:
   ```env
   BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
   GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   GOOGLE_SERVICE_ACCOUNT_EMAIL=course-bazar-sheets@...iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIB...-----END PRIVATE KEY-----\n"
   ADMIN_TELEGRAM_ID=987654321
   UPI_ID=yourname@upi
   PAYEE_NAME=Course Bazar
   SUPPORT_USERNAME=@coursebazar_support
   QR_IMAGE_PATH=./assets/qr-code.png
   PAYMENT_EXPIRY_HOURS=24
   ```

### Step 5: Start the Bot
- **To run the Telegram Bot directly:**
  ```cmd
  npm run bot
  ```
- **To run both the Telegram Bot and the interactive Web Dashboard:**
  ```cmd
  npm run dev
  ```
  *(Then open http://localhost:3000 in your browser)*

---

## 🧪 8. Testing Checklist (22 Test Scenarios)

| # | Test Scenario | Expected Result |
| :--- | :--- | :--- |
| 1 | Send `/start` | Bot replies with welcome message and inline buttons. |
| 2 | Click `🔎 Search Course` | Bot prompts: *"Please enter the course name you are looking for."* |
| 3 | Enter partial keyword (e.g., `youtube`) | Bot displays matching active courses as inline buttons. |
| 4 | Click `📚 Browse Courses` | Lists active courses with pagination. |
| 5 | Open Course Details | Shows Title, Creator, Price, Size, Language (NO ZIP password or Drive link). |
| 6 | Click `🛒 BUY NOW` | Displays personal UPI QR image, UPI ID, Payee, and `[✅ I HAVE PAID]`. |
| 7 | Click `✅ I HAVE PAID` | Bot prompts: *"Please upload a screenshot of your payment."* |
| 8 | Send text instead of photo | Bot politely asks for an image screenshot. |
| 9 | Upload payment screenshot | Bot acknowledges: *"⏳ PAYMENT SUBMITTED"*. |
| 10 | Admin receives alert | Admin Telegram account receives screenshot photo, customer details, and buttons. |
| 11 | Admin clicks `✅ APPROVE PAYMENT` | Google Sheet status changes to `PAID`. Customer immediately receives Drive link + ZIP password. |
| 12 | Customer opens Drive link | Google Drive link opens in browser. ZIP password matches Google Sheet. |
| 13 | Admin clicks `❌ REJECT PAYMENT` | Customer receives rejection notice. No course link or password sent. |
| 14 | Unauthorized user clicks Approve | Bot alerts: *"You are not authorized to perform admin actions."* |
| 15 | Customer checks `🛒 My Purchases` | Displays customer's purchased courses. `[📥 GET COURSE]` works for PAID courses. |
| 16 | Customer clicks `📥 GET COURSE` on unapproved order | Access denied; notifies that verification is pending. |
| 17 | Customer A tries to access Customer B's course | Blocked. Verifies matching Telegram ID. |
| 18 | Inactive course test | Set Course status to `Inactive` in Google Sheet; course is hidden from search/browse. |
| 19 | Duplicate approval test | Admin clicks Approve twice; bot warns: *"This purchase has ALREADY been approved!"* |
| 20 | Run `/admin` | Displays total courses, purchases, pending payments, revenue. |
| 21 | Add new course in Google Sheets | Bot instantly finds new course without restarting code. |
| 22 | Payment expiry check | Unsubmitted sessions older than 24 hours become `EXPIRED`. |

---

## 🚀 9. Production 24/7 Hosting Guide

When you want the bot running 24/7 without keeping your computer on:

### Option A: Render.com (Background Worker or Web Service)
1. Push your code to a private GitHub repository.
2. In [Render.com](https://render.com), create a **New Web Service** or **Background Worker**.
3. Connect your repository.
4. **Environment**: `Node`.
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `node dist/server.js` (or `npm run bot`)
7. Add your environment variables in the Render Dashboard under **Environment Variables**.
8. Deploy!

### Option B: Railway.app / VPS (Ubuntu)
1. Rent a small VPS (DigitalOcean, Hetzner, AWS Lightsail - ~$4/mo).
2. Install Node.js: `sudo apt update && sudo apt install -y nodejs npm`
3. Install PM2 process manager: `sudo npm install -g pm2`
4. Clone repo, copy `.env`, run `npm install && npm run build`.
5. Start with PM2:
   ```bash
   pm2 start "npm run bot" --name "course-bazar"
   pm2 save
   pm2 startup
   ```
   *PM2 will automatically restart your bot if the server reboots or crashes!*

---

## ❓ 10. Troubleshooting & FAQ

- **Error: `401 Unauthorized` on Telegram launch**:
  - *Cause*: `BOT_TOKEN` in `.env` is incorrect or missing.
  - *Fix*: Re-copy token from `@BotFather` into `.env` with no extra spaces.
- **Error: `The caller does not have permission` (Google Sheets)**:
  - *Cause*: The Google Sheet has not been shared with your service account email.
  - *Fix*: Open your Google Sheet → Click **Share** → Paste `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor**.
- **Error: `Requested entity was not found`**:
  - *Cause*: `GOOGLE_SHEET_ID` is wrong or sheet tabs are misnamed.
  - *Fix*: Check the URL ID between `/d/` and `/edit`. Ensure tab names are `Courses`, `Purchases`, `Settings`, `Admins`.
- **Customer didn't get QR code**:
  - *Cause*: `assets/qr-code.png` is missing.
  - *Fix*: Save your QR image as `assets/qr-code.png` or check `QR_IMAGE_PATH` in `.env`. The bot will also send text details automatically if the image is missing.
