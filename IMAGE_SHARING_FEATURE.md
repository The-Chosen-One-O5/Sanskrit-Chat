# Image Sharing Feature

## Overview
The Sanskrit Universal Chat application now supports real-time image sharing with automatic compression and an intuitive user interface.

## Features

### Upload Methods
1. **File Picker**: Click the blue image button next to the send button to select an image file
2. **Drag & Drop**: Drag an image file from your file system directly onto the chat area

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- GIF (.gif)

### File Size & Compression
- Maximum upload size: 10MB (before compression)
- Automatic compression for large images:
  - Full images: Max 1920px width, 85% quality
  - Thumbnails: Max 300px dimensions, 70% quality
- Compression significantly reduces file size while maintaining visual quality

### Display & Interaction
- **Thumbnail View**: Images appear as thumbnails (max 300x300px) in the chat
- **Sender Info**: Shows who sent the image and timestamp
- **File Info**: Displays original filename and compressed file size
- **Click to Expand**: Click any image thumbnail to open the full-size lightbox viewer

### Lightbox Modal Features
- **Full-Size Display**: View images at their full resolution
- **Zoom Controls**: Zoom in/out with buttons (0.5x to 3x scale)
- **Mouse Wheel Zoom**: Use mouse wheel to zoom smoothly
- **Pan**: Drag zoomed images to view different areas
- **Download**: Direct download button to save the original image
- **Close**: Click the X button or click outside the image to close

### Real-Time Sync
- Images appear instantly for all users in the room
- Uses Firebase Firestore for metadata and Firebase Storage for files
- Maintains read receipt functionality for image messages

### Storage Structure
Images are organized in Firebase Storage:
```
rooms/
  {roomCode}/
    images/
      {timestamp}-{userId}  (full image)
      thumbnails/
        {timestamp}-{userId}  (thumbnail)
```

## Implementation Details

### No Translation for Images
- Image messages completely bypass the `/api/translate` endpoint
- Messages are stored with `type: 'image'` instead of `type: 'user'`
- No Sanskrit translation is attempted for image messages

### Message Metadata
Image messages in Firestore contain:
- `type`: "image"
- `imageUrl`: Full-size image download URL
- `thumbnailUrl`: Thumbnail download URL
- `originalFileName`: Original name of the uploaded file
- `fileSize`: Size of the compressed image in bytes
- `userId`, `userName`: Sender information
- `timestamp`: Server timestamp
- `readBy`: Object tracking who has viewed the message

### Browser Compatibility
- Uses native Canvas API for image compression (supported by all modern browsers)
- Firebase Storage SDK v11.6.1
- Progressive image loading with `loading="lazy"` attribute

## Error Handling
- Validates file type before upload
- Checks file size limits
- Displays user-friendly error messages for:
  - Invalid file types
  - Files exceeding size limits
  - Upload failures
  - Compression errors

## Performance Optimizations
- Client-side compression reduces bandwidth usage
- Thumbnail generation for fast chat rendering
- Lazy loading for image thumbnails
- Efficient Firebase Storage paths prevent conflicts
