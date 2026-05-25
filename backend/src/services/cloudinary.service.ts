import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions } from 'cloudinary';
import multer from 'multer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function assertConfigured(): void {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw ApiError.internal('Image upload is not configured on this server');
  }
}

/**
 * Multer middleware using in-memory storage. Files are held in Buffer form
 * so they can be streamed directly to Cloudinary without hitting the disk.
 * Use multerUpload.array('photos', 12) or multerUpload.single('photo').
 */
export const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('LIMIT_FILE_TYPE: only image files are accepted'));
    }
    cb(null, true);
  },
});

/** Upload a single Buffer to Cloudinary and return the secure URL. */
export async function uploadBuffer(
  buffer: Buffer,
  opts: { subfolder: string; publicId?: string },
): Promise<string> {
  assertConfigured();
  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/${opts.subfolder}`;
  const options: UploadApiOptions = {
    folder,
    public_id: opts.publicId,
    resource_type: 'image',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  };
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err || !result) {
        logger.error({ err }, 'Cloudinary upload failed');
        return reject(ApiError.internal('Image upload failed'));
      }
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

/** Upload every file in a multer array field and return secure URL list. */
export async function uploadFiles(
  files: Express.Multer.File[],
  subfolder: string,
): Promise<string[]> {
  if (files.length === 0) return [];
  return Promise.all(files.map((f) => uploadBuffer(f.buffer, { subfolder })));
}

/**
 * Extract the Cloudinary public_id from a secure URL so it can be deleted.
 * "https://res.cloudinary.com/<cloud>/image/upload/v1234/<folder>/abc.jpg"
 * → "<folder>/abc"
 */
export function extractPublicId(url: string): string {
  const after = url.split('/upload/')[1];
  if (!after) return '';
  const withoutVersion = after.replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^.]+$/, '');
}

export async function deleteImage(url: string): Promise<void> {
  if (!url) return;
  const publicId = extractPublicId(url);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId).catch((err) => {
    logger.warn({ err, publicId }, 'Cloudinary delete failed');
  });
}

export async function deleteImages(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(deleteImage));
}
