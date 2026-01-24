# Manual Testing Checklist ✓

**Site URL**: http://localhost:3000  
**Date**: January 24, 2026  
**Status**: Development server is running

---

## 🧪 Testing Instructions

Open your browser and navigate to **http://localhost:3000**, then work through this checklist.

---

## ✅ Visual & Layout Tests

### Page Load
- [ ] Page loads completely without errors
- [ ] All sections visible on scroll
- [ ] No broken images (check browser console F12)
- [ ] No layout shifts or jumping content

### Styling
- [ ] Gold gradient colors display correctly
- [ ] Glass morphism effects render properly
- [ ] Animations are smooth (not janky)
- [ ] Text is readable on all backgrounds

---

## ✅ Navigation Tests

### Desktop Navigation
- [ ] Navigation bar is visible at top
- [ ] Logo/home button scrolls to top when clicked
- [ ] Navigation menu items are clickable
- [ ] Smooth scroll animation works

### Mobile Navigation (Resize browser to 375px width)
- [ ] Hamburger menu icon appears
- [ ] Clicking hamburger opens mobile menu
- [ ] Mobile menu links work
- [ ] Clicking link closes mobile menu

---

## ✅ Hero Section Tests

### Background Video
- [ ] Background video plays automatically
- [ ] Video loops continuously
- [ ] Video doesn't slow down the page

### Hero Buttons
- [ ] **"Listen Now"** button is visible
  - [ ] Click opens YouTube in new tab
  - [ ] Correct URL: https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-
  
- [ ] **"Learn More"** button is visible
  - [ ] Click scrolls smoothly to services/next section
  - [ ] Scroll offset is appropriate (not hiding content)

---

## ✅ Hero Video Section Tests

### Video Player
- [ ] Video section is visible
- [ ] **"Watch Showreel"** button present
  - [ ] Click starts video playback
  - [ ] Video plays without buffering issues
  - [ ] Video controls work (play/pause/volume)

### Project Button
- [ ] **"Start Your Project"** button visible
  - [ ] Click opens modal/contact form
  - [ ] Modal has close button (X)
  - [ ] Close button works

---

## ✅ Music Player Tests

### Player Interface
- [ ] Music player section loads
- [ ] Current track displays: "Fool in Here Ft JackPot" or "NoteBook"
- [ ] Artist name shows correctly
- [ ] Album art/icon displays

### Playback Controls
- [ ] **Play button** (▶️)
  - [ ] Click starts audio playback
  - [ ] Hear audio playing
  - [ ] Button changes to Pause (⏸)
  
- [ ] **Pause button** (⏸)
  - [ ] Click pauses audio
  - [ ] Button changes back to Play (▶️)

- [ ] **Progress bar**
  - [ ] Shows current playback position
  - [ ] Animates smoothly as track plays
  - [ ] Updates in real-time

### Track Control
- [ ] **Next button** (⏭)
  - [ ] Click switches to next track
  - [ ] Progress bar resets
  - [ ] New track name displays
  
- [ ] **Previous button** (⏮)
  - [ ] Click switches to previous track
  - [ ] Progress bar resets
  - [ ] Previous track name displays

### Playlist
- [ ] Track list shows both songs:
  - [ ] Track 1: "Fool in Here Ft JackPot" by Vlone Tr3
  - [ ] Track 2: "NoteBook" by JackPot
  
- [ ] Click individual track:
  - [ ] Selected track starts playing
  - [ ] Track is highlighted/indicated as current
  - [ ] Previous track stops

### Audio Quality
- [ ] Audio plays without crackling
- [ ] Audio plays without stuttering
- [ ] Volume is appropriate (not too loud/quiet)
- [ ] No console errors about audio files (check F12)

---

## ✅ Artist Roster Tests

### Display
- [ ] Artist roster section visible
- [ ] Artist cards display properly
- [ ] Artist images load (jackpot and placeholders)
- [ ] Artist names visible

### Interaction
- [ ] **"View All Artists"** button (if present)
  - [ ] Click expands more artists OR
  - [ ] Click navigates to artists page OR
  - [ ] Click opens modal with all artists
  
- [ ] Hover effects work on artist cards

---

## ✅ Event Calendar Tests

### Display
- [ ] Event calendar section visible
- [ ] Events display in grid/list
- [ ] Event dates formatted correctly
- [ ] Event information readable

### Interaction
- [ ] Events are clickable (if applicable)
- [ ] No broken links or 404s

---

## ✅ Pricing Section Tests

### Pricing Video
- [ ] Pricing video section visible
- [ ] Video (`jackpot-notebook-2.mp4`) displays
- [ ] Video plays when triggered

### Pricing Cards
- [ ] Pricing cards display
- [ ] Prices visible and formatted
- [ ] Service descriptions readable
- [ ] CTA buttons present

---

## ✅ Video Editing Section Tests

- [ ] Section visible
- [ ] Service offerings clear
- [ ] Images/videos load
- [ ] Call-to-action buttons work

---

## ✅ Contact Form Tests

### Form Display
- [ ] Contact form visible
- [ ] All fields present:
  - [ ] Name field
  - [ ] Email field
  - [ ] Phone field
  - [ ] Project Type dropdown
  - [ ] Message textarea
  - [ ] Budget (optional)
  
- [ ] Submit button visible

### Form Validation
- [ ] Submit empty form:
  - [ ] Error messages appear
  - [ ] Required fields indicated
  
- [ ] Enter invalid email (e.g., "test"):
  - [ ] Email validation error shows
  
- [ ] Enter invalid phone:
  - [ ] Phone validation error shows

### Form Submission
> ⚠️ **Note**: This will send a real email if API key is configured

- [ ] Fill out form with valid data:
  - Name: Test User
  - Email: test@example.com
  - Phone: 770-310-9558
  - Message: Testing contact form
  
- [ ] Click Submit:
  - [ ] Loading indicator appears
  - [ ] Success message displays
  - [ ] Form clears OR modal closes
  - [ ] Check email inbox for message

---

## ✅ Footer Tests

### Content
- [ ] Footer visible at bottom
- [ ] Contact information displays
- [ ] Social media icons visible

### Social Links
Test each link opens in NEW TAB and goes to correct URL:

- [ ] **Instagram**: https://www.instagram.com/damoneyfam/
- [ ] **Twitter/X**: Should go to Instagram (fallback)
- [ ] **YouTube**: https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-
- [ ] **TikTok**: https://www.tiktok.com/@jackpotofficial
- [ ] **SoundCloud**: https://m.soundcloud.com/yvng-lotto/emastered_lotto-devil-inside
- [ ] **Spotify**: (if URL configured)
- [ ] **Apple Music**: (if URL configured)

### Email/Phone Links
- [ ] Email link (if present) opens mail client
- [ ] Phone link (if present) opens dialer on mobile

---

## ✅ Responsive Design Tests

### Mobile (375px width)
- [ ] Resize browser to 375px
- [ ] All content is readable
- [ ] No horizontal scroll
- [ ] Images scale properly
- [ ] Music player is usable
- [ ] Forms are accessible
- [ ] Buttons are tappable (not too small)

### Tablet (768px width)
- [ ] Resize to 768px
- [ ] Layout adjusts appropriately
- [ ] Content doesn't look stretched
- [ ] Navigation changes at breakpoint

### Desktop (1920px width)
- [ ] Content centered or fills screen nicely
- [ ] No excessive white space
- [ ] Text line lengths reasonable
- [ ] Images not pixelated

---

## ✅ Performance Tests

### Load Time
- [ ] Page loads in under 3 seconds
- [ ] No significant delays

### Animations
- [ ] Scroll animations trigger smoothly
- [ ] Hover effects are responsive
- [ ] No animation lag

### Console (F12 → Console tab)
- [ ] No red errors
- [ ] No yellow warnings about best practices
- [ ] No 404 errors for missing files

### Network (F12 → Network tab)
- [ ] Reload page
- [ ] All assets load (status 200)
- [ ] No failed requests (red)
- [ ] Audio files load: `/audio/wok audio...` and `/audio/notebook...`
- [ ] Videos load: `/videos/background.mp4`, etc.
- [ ] Images load: `/images/...`

---

## ✅ Browser Compatibility

Test on multiple browsers (if possible):

### Chrome
- [ ] All features work

### Firefox
- [ ] All features work

### Safari
- [ ] All features work
- [ ] Audio plays (Safari can be picky)

### Edge
- [ ] All features work

---

## 📋 Issues Found

Use this space to note any issues discovered:

```
Issue #1:
- Description: 
- Steps to reproduce:
- Expected behavior:
- Actual behavior:

Issue #2:
- Description:
- Steps to reproduce:
- Expected behavior:
- Actual behavior:
```

---

## ✅ Final Sign-Off

Once all tests pass:

- [ ] All critical functionality works
- [ ] No console errors
- [ ] No broken links
- [ ] No missing images/videos/audio
- [ ] Forms validate and submit
- [ ] Responsive on all screen sizes
- [ ] Cross-browser compatible

**Tested by**: _______________  
**Date**: _______________  
**Status**: ☐ PASS  ☐ FAIL (issues noted above)

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Review [CLEANUP-SUMMARY.md](./CLEANUP-SUMMARY.md)
2. Follow [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
3. Deploy to production!

If issues found:
1. Document issues above
2. Fix issues in code
3. Re-test
4. Repeat until all tests pass
