import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// ─── Cloudinary storage engine ────────────────────────────────────────────────
// Uploaded files are stored under the 'yuvaverse_banners' folder in Cloudinary.
// The public_id is unique per upload (timestamp + random suffix) to avoid
// overwrites when the same banner is re-uploaded.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'yuvaverse_banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 630, crop: 'limit', quality: 'auto' }],
  } as Record<string, unknown>,
});

// ─── Multer middleware ────────────────────────────────────────────────────────
// Accepts a single file on the 'banner' field (≤ 5 MB).
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter(_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted for event banners.'));
    }
  },
});

export const uploadBanner = upload.single('banner');
export default upload;
