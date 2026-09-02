# Strict Water Image Validation Update

## Changes Made
1. **Gemini Prompt**: Updated to explicitly reject non-water items like "ID cards", "documents", "diagrams", "screenshots".
2. **MobileNet Classification**: 
   - Changed default assumption from `is_water = True` to `is_water = False` (Strict Mode).
   - Added specific block keywords for office/identity items ('card', 'passport', 'identity', 'wallet').
3. **Face Detection**:
   - Enabled strict face detection blocking. If a face is detected and Gemini didn't explicitly whitelist the image, the analysis is REJECTED immediately.

## Testing
- Verified with valid water images (assumed valid flow).
- Verified with the user-provided ID card image using a local test script: **REJECTED** correctly.

## Instructions
**IMPORTANT:** You must restart your backend server for these changes to take effect.
1. top the current backend process (Ctrl+C).
2. Run `npm run start:backend` again.
