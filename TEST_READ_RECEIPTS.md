# Testing Guide for Read Receipts Feature

## Manual Testing Checklist

### Setup
1. Open the application in two different browsers (or incognito windows)
2. Create user accounts with different names in each browser
3. Create a public room from Browser 1
4. Join the same room from Browser 2

### Test Cases

#### TC1: Message Delivery Indicator
**Steps:**
1. In Browser 1, send a message
2. Observe the message in Browser 1

**Expected Result:**
- Single gray checkmark appears next to the message timestamp
- Message shows "You" as sender
- Message has hover effect (shadow increases on hover)

**Status:** [ ]

---

#### TC2: Read Receipt - Single Recipient
**Steps:**
1. In Browser 2, scroll to view the message sent from Browser 1
2. Wait 1-2 seconds
3. Observe the message in Browser 1

**Expected Result:**
- Checkmark changes from single to double checkmark (gray)
- Change happens in real-time without page refresh

**Status:** [ ]

---

#### TC3: Read Receipt - All Recipients
**Steps:**
1. Open a third browser/window and join the same room
2. Have Browser 3 send at least one message (to become a participant)
3. In Browser 1, send a new message
4. View the message in Browser 2
5. View the message in Browser 3
6. Observe the message in Browser 1

**Expected Result:**
- Initially shows single checkmark (delivered)
- After first view: double checkmark (gray)
- After all participants view: double checkmark turns blue

**Status:** [ ]

---

#### TC4: Message Info Modal - Click Handler
**Steps:**
1. In Browser 1, click on one of your sent messages
2. Observe the modal that appears

**Expected Result:**
- Modal appears with semi-transparent black overlay
- Modal shows:
  - "Message Info" header with info icon
  - Close button (X) in top right
  - Message content (original + Sanskrit)
  - Sent timestamp
  - Status (Delivered/Read by some/Read by all)
  - "Read by" section with list of users

**Status:** [ ]

---

#### TC5: Message Info Modal - Read By List
**Steps:**
1. Open message info modal for a message that has been read
2. Review the "Read by" section

**Expected Result:**
- Each reader shown with:
  - User name
  - "(You)" indicator if it's your read receipt
  - Timestamp when they read it
- List is scrollable if many readers
- Format: "Username" on left, "Timestamp" on right

**Status:** [ ]

---

#### TC6: Message Info Modal - Close Functionality
**Steps:**
1. Open message info modal
2. Test closing methods:
   a. Click the X button
   b. Click outside the modal (on overlay)

**Expected Result:**
- Modal closes smoothly in both cases
- Background chat is accessible again

**Status:** [ ]

---

#### TC7: Non-Sender Cannot Click Message
**Steps:**
1. In Browser 2, try to click on a message sent by Browser 1
2. Observe behavior

**Expected Result:**
- No modal appears
- Message is not clickable (no cursor pointer)
- No hover effects on received messages

**Status:** [ ]

---

#### TC8: System Messages
**Steps:**
1. Leave and rejoin a room
2. Observe system messages (e.g., "User has joined the chat")

**Expected Result:**
- System messages have no read receipts
- System messages are not clickable
- Centered blue badge styling maintained

**Status:** [ ]

---

#### TC9: Real-time Updates
**Steps:**
1. In Browser 1, send a message
2. Keep Browser 1 visible
3. In Browser 2, scroll to view the message
4. Watch Browser 1 without refreshing

**Expected Result:**
- Browser 1 sees checkmark change from single to double in real-time
- No page refresh needed
- Update happens within 1-2 seconds

**Status:** [ ]

---

#### TC10: Intersection Observer - Visibility Tracking
**Steps:**
1. Send multiple messages from Browser 1 (5-10 messages)
2. In Browser 2, keep messages out of view (don't scroll down)
3. Wait 5 seconds
4. Scroll down to view the messages
5. Check Browser 1

**Expected Result:**
- Messages show single checkmark while not in view
- As each message scrolls into view in Browser 2, checkmark updates in Browser 1
- Messages marked as read only when actually visible (50% threshold)

**Status:** [ ]

---

#### TC11: Leave Room Cleanup
**Steps:**
1. Send and view messages in a room
2. Leave the room
3. Join a different room
4. Check browser console for errors

**Expected Result:**
- No console errors
- Observer properly disconnected
- No memory leaks
- visibleMessages set cleared

**Status:** [ ]

---

#### TC12: Empty Read Receipts
**Steps:**
1. Send a message in a room where you're the only participant
2. Click on the message to view info

**Expected Result:**
- Modal opens successfully
- Shows "No read receipts yet" message
- Status shows "Delivered"
- No JavaScript errors

**Status:** [ ]

---

#### TC13: Mobile Responsiveness
**Steps:**
1. Open app on mobile device or use browser dev tools mobile view
2. Send and receive messages
3. Click on a message to open info modal

**Expected Result:**
- Checkmarks visible and properly sized on mobile
- Modal fits screen properly (w-11/12 width)
- Touch interactions work smoothly
- No horizontal scrolling

**Status:** [ ]

---

#### TC14: Multiple Rooms
**Steps:**
1. Create Room A and send messages
2. Create Room B and send messages
3. Join Room A from Browser 2 and view messages
4. Switch to Room B in Browser 2
5. Check read receipts in Browser 1

**Expected Result:**
- Read receipts specific to each room
- No cross-contamination between rooms
- Observer resets when switching rooms

**Status:** [ ]

---

## Performance Testing

### PT1: Large Message History
**Steps:**
1. Create a room with 50+ messages
2. Join the room and scroll through messages
3. Monitor browser performance

**Expected Result:**
- Smooth scrolling
- No lag when rendering checkmarks
- Observer handles many elements efficiently

**Status:** [ ]

---

### PT2: Firebase Update Frequency
**Steps:**
1. Monitor Firebase console/network tab
2. Scroll through 10+ unread messages quickly

**Expected Result:**
- Each message marked as read only once
- No redundant Firebase updates
- visibleMessages set prevents duplicate updates

**Status:** [ ]

---

## Edge Cases

### EC1: Offline Behavior
**Steps:**
1. Send messages while online
2. Disconnect network
3. Try to view messages
4. Reconnect network

**Expected Result:**
- Graceful degradation when offline
- Updates sync when back online
- No data corruption

**Status:** [ ]

---

### EC2: Rapid Room Switching
**Steps:**
1. Quickly switch between multiple rooms (3-4 times in 5 seconds)
2. Check console for errors

**Expected Result:**
- No race conditions
- Observer properly cleaned up each time
- No memory leaks

**Status:** [ ]

---

### EC3: Message Timestamp Edge Cases
**Steps:**
1. Check message info for a message still sending (serverTimestamp pending)
2. Check message with very old timestamp

**Expected Result:**
- Shows "Sending..." for pending messages
- Formats old timestamps correctly
- No JavaScript errors

**Status:** [ ]

---

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Automated Testing Notes

For future implementation, consider:
- Unit tests for `getReadStatus()` logic
- Integration tests for Firestore read/write operations
- E2E tests using Playwright or Cypress
- Performance benchmarks for large message lists
