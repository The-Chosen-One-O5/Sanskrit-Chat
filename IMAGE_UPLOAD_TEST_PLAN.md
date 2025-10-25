# Image Upload Test Plan

## Overview
This document outlines the testing procedures to verify the image upload bug fix.

## Pre-Test Requirements

### 1. Firebase Storage Rules Deployed
Before testing, ensure Firebase Storage rules are deployed:
- Go to Firebase Console → Storage → Rules
- Copy rules from `storage.rules` file
- Click "Publish"

### 2. Browser Setup
- Use Chrome, Firefox, or Safari (latest version)
- Open Developer Tools (F12)
- Keep Console tab open during testing
- Enable Network tab to monitor requests

## Test Cases

### Test Case 1: Small JPEG Image Upload
**Objective**: Verify basic image upload functionality with a small file

**Steps**:
1. Open app and create/join a room
2. Click the blue image button next to send button
3. Select a JPEG image < 100KB
4. Observe loading spinner appears
5. Check console for logs

**Expected Results**:
- ✅ Loading spinner appears immediately
- ✅ Console shows compression logs
- ✅ Console shows thumbnail generation logs
- ✅ Console shows Firebase Storage upload logs
- ✅ Console shows "Image uploaded and message saved successfully!"
- ✅ Loading spinner disappears
- ✅ Image thumbnail appears in chat
- ✅ No error messages displayed

**Console Log Pattern**:
```
uploadImageMessage: Starting upload for file: test.jpg type: image/jpeg size: 50000
compressImage: Starting compression for: test.jpg
compressImage: File read successfully, loading image...
compressImage: Image loaded. Original dimensions: 800 x 600
compressImage: Canvas dimensions: 800 x 600
compressImage: Blob created successfully. Size: 45000
generateThumbnail: Starting thumbnail generation for: test.jpg
...
uploadImageMessage: Image uploaded and message saved successfully!
```

### Test Case 2: Large PNG Image Upload
**Objective**: Verify compression works correctly with large files

**Steps**:
1. In same room, click image button again
2. Select a PNG image > 5MB
3. Observe compression progress in console

**Expected Results**:
- ✅ Image gets compressed (check console for size reduction)
- ✅ Upload completes successfully
- ✅ Image appears in chat
- ✅ File size in message shows compressed size (much smaller than original)

### Test Case 3: Multiple Image Upload
**Objective**: Verify sequential uploads work correctly

**Steps**:
1. Upload 3 different images one after another
2. Wait for each to complete before uploading next

**Expected Results**:
- ✅ All 3 images appear in chat in order
- ✅ Each has unique timestamp
- ✅ No conflicts or overwrites

### Test Case 4: Drag and Drop Upload
**Objective**: Verify drag-and-drop functionality

**Steps**:
1. Drag an image file from desktop/file explorer
2. Drop it onto the chat message area

**Expected Results**:
- ✅ Drop overlay appears during drag
- ✅ Upload starts on drop
- ✅ Same success behavior as file picker

### Test Case 5: Invalid File Type
**Objective**: Verify proper error handling for invalid files

**Steps**:
1. Try to upload a .txt or .pdf file
2. Observe error message

**Expected Results**:
- ✅ Error message: "Please select a valid image file (JPEG, PNG, WebP, or GIF)"
- ✅ No upload attempt made
- ✅ Console shows validation error
- ✅ No loading spinner appears

### Test Case 6: File Too Large
**Objective**: Verify file size validation

**Steps**:
1. Try to upload an image > 10MB
2. Observe error message

**Expected Results**:
- ✅ Error message: "Image file is too large. Maximum size is 10MB."
- ✅ No upload attempt made
- ✅ Console shows size validation error

### Test Case 7: Image Viewing
**Objective**: Verify lightbox viewer works

**Steps**:
1. Click on an uploaded image thumbnail
2. Lightbox should open
3. Try zoom in/out buttons
4. Try download button
5. Close lightbox

**Expected Results**:
- ✅ Lightbox opens with full-size image
- ✅ Zoom buttons work
- ✅ Download button downloads the image
- ✅ Close button dismisses lightbox

### Test Case 8: Cross-User Image Visibility
**Objective**: Verify images are visible to all room members

**Steps**:
1. Open app in two different browsers/tabs
2. Join same room from both
3. Upload image from first browser
4. Check second browser

**Expected Results**:
- ✅ Image appears in both browsers in real-time
- ✅ Thumbnail loads correctly in both
- ✅ Both users can open lightbox viewer

### Test Case 9: Read Receipts for Images
**Objective**: Verify read receipt tracking works for images

**Steps**:
1. Send image from user A
2. View chat from user B
3. Check read receipt indicators

**Expected Results**:
- ✅ Single checkmark initially (sent)
- ✅ Double checkmark after user B scrolls past image (read)

## Error Scenarios to Test

### Scenario 1: Storage Rules Not Deployed
**Simulate**: Don't deploy storage rules or use restrictive rules

**Expected Behavior**:
- ❌ Upload fails with clear error
- ✅ Console shows: `storage/unauthorized`
- ✅ Error message: "Permission denied. Please check Firebase Storage rules."
- ✅ Loading spinner clears

### Scenario 2: Network Disconnection
**Simulate**: Disable network mid-upload

**Expected Behavior**:
- ❌ Upload fails
- ✅ Console shows network error
- ✅ Error message displayed to user
- ✅ Loading spinner clears

### Scenario 3: Storage Not Initialized
**Simulate**: Comment out storage initialization (for testing only)

**Expected Behavior**:
- ❌ Upload prevented before starting
- ✅ Error message: "Storage not initialized. Please refresh the page."
- ✅ Console shows: "Firebase Storage not initialized"

## Performance Checks

### Load Time
- Images should appear in chat within 5 seconds for files < 1MB
- Larger files may take longer but should show progress

### Compression Efficiency
- Original 5MB image should compress to < 1MB
- Check console for before/after sizes
- Visual quality should remain good

### Memory Usage
- Upload 10 images in sequence
- Check browser memory (Task Manager)
- Should not cause memory leaks or excessive usage

## Firebase Console Verification

After successful uploads:

1. **Storage Section**:
   - Go to Firebase Console → Storage
   - Navigate to `rooms/{roomCode}/images/`
   - Verify full-size images are present
   - Navigate to `rooms/{roomCode}/images/thumbnails/`
   - Verify thumbnails are present

2. **Firestore Section**:
   - Go to Firebase Console → Firestore
   - Navigate to: `artifacts/{appId}/public/data/sanskrit_rooms/{roomCode}/messages`
   - Verify message documents with `type: 'image'`
   - Check that `imageUrl` and `thumbnailUrl` fields are populated
   - Verify `originalFileName` and `fileSize` are correct

## Browser Compatibility

Test on the following browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

## Regression Tests

Ensure existing functionality still works:
- ✅ Text messages send correctly
- ✅ Room creation/joining works
- ✅ Public room list displays
- ✅ Read receipts for text messages work
- ✅ Emoji reactions work
- ✅ Room deletion (host only) works

## Success Criteria

All test cases must pass with:
- ✅ No infinite loading states
- ✅ Clear error messages when failures occur
- ✅ Detailed console logging for debugging
- ✅ Images appear correctly in Firebase Storage
- ✅ Firestore documents created with correct metadata
- ✅ Real-time sync working across multiple users
- ✅ No browser console errors during successful uploads

## Rollback Plan

If critical issues are found:
1. Revert changes to `index.html`
2. Restore original storage bucket configuration
3. Remove detailed logging if causing performance issues
4. Document issues for further investigation
