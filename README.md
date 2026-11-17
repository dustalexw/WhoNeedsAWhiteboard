# Who Needs a Whiteboard? 📅

An HR desk for **senior care hiring**. It tracks applicants, interviews, caregiver orientation days and credential expirations, and it keeps **the date and the day of the week in big letters at the top of every screen**.

## How to start

There's nothing to install. Open `index.html` in any modern browser (Chrome, Edge, Safari, Firefox).

- The first time you open it, you'll see **sample data** so you can try everything. Click **"Start fresh with my own data"** when you're ready to use it for real.
- Everything is saved **privately in that browser on that computer**. Go to **Settings → Download backup** every week to keep a copy. **Restore from backup** brings it back, or moves it to another computer.
- To use it on a shared computer or from anywhere, you can host the three files (`index.html`, `app.js`, `styles.css`) on any static web host, such as GitHub Pages. Each browser still keeps its own data.

## Put it on your website (e.g. sipassgames.com)

It's a plain static site, so any web host works (cPanel, Netlify, Cloudflare Pages, GitHub Pages, Wix/Squarespace "upload files", etc.).

1. Download **`hr-whiteboard.zip`** (in this repo) and unzip it.
2. Upload the **contents** to a folder on your site, e.g. `public_html/hr-whiteboard/`.
3. Visit `https://sipassgames.com/hr-whiteboard/`.

It must be served over **https** for the install button and offline mode to work.

### Install it like an app
Once it's online, it can be installed on any device:
- **Chrome / Edge (Windows, Mac, Android):** click **⬇ Install app** in the menu bar, or the install icon in the address bar.
- **iPhone / iPad:** open the page in Safari, tap **Share**, then **Add to Home Screen**.

After installing, it opens in its own window with its own icon and **keeps working without internet**.

> Each device keeps its own data. Use **Settings → Download backup / Restore** to move data between devices.

## What it does

### 📅 The date is always the first thing you see
- A big banner shows **TODAY IS TUESDAY, November 17, 2026** with a live clock and the week number.
- A **two-week strip** shows how many interviews and orientations are on each day. Click a day to open it.
- **Every weekday has its own color** (Monday blue, Thursday purple, and so on). That color is used everywhere: calendar headers, date badges, orientation cards and messages.
- Every date in the app shows its weekday, plus "Tomorrow", "this Thursday · in 2 days" and similar labels.
- When you pick a date in any form, the weekday appears right below it. You get a warning if it falls on a **weekend**, and it tells you how many other things are already booked that day.

### Day view (home)
- A schedule for the day: interviews, orientation days and follow-up calls, in time order.
- ◀ ▶ buttons (or the ← → keys) move between days. **T** jumps back to today.
- Summary tiles: people in the pipeline, interviews this week, the no-show rate, hires this month, and open seats at the next orientation.
- A **Needs attention** list that it builds automatically:
  - interviews with no result recorded
  - new applicants not contacted within 2 days (good caregivers get hired elsewhere fast)
  - offers waiting more than 3 days for an answer
  - hired caregivers not yet booked for orientation
  - paperwork still missing a few days before someone's orientation
  - orientation days that are empty or overbooked
  - overdue follow-ups and expired credentials
- A "next 7 days" overview and a printable **day sheet**.

### 👥 Applicants
- A board with six stages: **Applied → Screening → Interview → Offer → Hired → Active**, plus Archived.
- Search, filter by position (CNA, HHA, PCA, Med Tech, LPN, RN…), see shift availability, and set follow-up reminders.
- Each person has a history log, call and text links, and a CSV export of everyone.
- Moving someone forward walks you to the next step. Moving to **Interview** opens the scheduler; moving to **Hired** opens orientation booking.

### 🗣️ Interviews
- Schedule interviews with the interviewer, type and length. It **warns you about double-booking** while you fill in the form.
- Record the result with one click: **Passed**, **Not a fit** or **No-show**.
  - Passed offers to move the person to Offer.
  - Not a fit offers to archive them.
  - No-show offers a follow-up reminder for the next day.

### 🎓 Orientation days
- Create one orientation day, or **repeat it weekly or every other week** in one step. A preview shows every date it will create.
- Seat capacity, the trainer, and an editable agenda (with a ready-made senior-care agenda).
- Add caregivers one at a time or **add everyone who's waiting** at once. Each person's paperwork progress shows on the card.
- Mark people **Attended** (this makes them Active automatically) or **No-show** (this puts them back on the waiting list). These buttons appear once the day arrives.
- Print a **sign-in sheet** with the weekday in large type, a list of missing paperwork for each person, and the agenda.

### 🛡️ Compliance
- Each caregiver has an onboarding checklist (background check, TB test, I-9, HIPAA, elder abuse training and more) that you can change in Settings.
- It tracks credential expiration dates (CPR, TB, CNA license, driver's license…) and flags anything **expired, due within 30 days, or due within 60 days**.
- It also flags **required credentials that aren't on file**.

### ✉️ Messages
- Ready-to-use templates: interview invitation and reminder, offer, orientation confirmation and reminder, missing paperwork, credential renewal, and "not moving forward". The weekday is always filled in, for example "Thursday, November 19".
- The person's name, date, time, location, missing paperwork and expiring credentials are filled in automatically.
- Buttons to **copy**, **open in email**, **text**, and **mark as sent** (this records it in the person's history).

### ⚙️ Settings
Set your organization name, your name and phone number, positions, interviewers and trainers, applicant sources, the checklist items, credential types, the "please bring" list for orientation, and default seat capacity. Backup, restore, CSV export and erase are also here.

## Keyboard shortcuts
| Key | Action |
| --- | --- |
| ← / → | Previous / next day |
| T | Today |
| 1–8 | Switch sections |
| N | New applicant |
| Esc | Close a window |
