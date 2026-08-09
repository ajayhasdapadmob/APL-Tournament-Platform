# 🏏 APL Tournament Platform

A complete cricket tournament management platform for organizers, teams and players.

## 🏆 About

APL Tournament Platform helps organizers create and manage cricket tournaments from one place.

The platform uses Firebase Authentication and Cloud Firestore for storing tournament, team, match and result data.

---

## ✨ Features

### 👤 Organizer

- Organizer Profile
- Organizer Dashboard
- Create Tournament
- My Tournaments
- Tournament Details
- Admin Panel

### 🏏 Tournament

- Tournament Name
- Venue
- Tournament Type
- Entry Fee
- Prize Money
- Team Limit
- Tournament Status

### 👥 Team Registration

Teams can register for a selected tournament.

Registration includes:

- Team Name
- Captain Name
- Mobile Number
- Email
- City
- Player Names
- Registration Status

Registration status can be:

- ⏳ Pending
- ✅ Approved
- ❌ Rejected
- 💰 Payment Paid
- ⏸️ On Hold
- 🚫 Cancelled

### 📅 Schedule

Organizers can:

- Add matches
- Set Team A
- Set Team B
- Set Date
- Set Time
- Set Venue
- Delete matches

### 🏆 Results

Organizers can:

- Select Match Winner
- Enter Team Scores
- Add Result Remarks
- Save Result
- Clear Result

### 📊 Points Table

The platform can be extended to calculate:

- Matches Played
- Wins
- Losses
- Ties
- Points
- Net Run Rate

### 🔴 Live Score

Live scoring functionality can be connected with the tournament matches.

---

## 📁 Project Structure

```text
APL-Tournament-Platform/
│
├── index.html
├── dashboard.html
├── login.html
├── profile.html
├── create-tournament.html
├── my-tournaments.html
├── tournament.html
├── team-registration.html
├── schedule.html
├── results.html
├── points.html
├── live.html
├── admin.html
├── contact.html
├── receipt.html
│
├── manifest.json
├── package.json
├── .gitignore
├── README.md
│
├── css/
│   ├── style.css
│   └── profile.css
│
├── js/
│   ├── firebase.js
│   ├── auth-check.js
│   ├── dashboard.js
│   ├── profile.js
│   ├── create-tournament.js
│   ├── my-tournaments.js
│   ├── tournament.js
│   ├── registration.js
│   ├── schedule.js
│   ├── results.js
│   ├── points.js
│   ├── live.js
│   └── admin.js
│
└── images/
    └── ...