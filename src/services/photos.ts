// Foto's verkleinen en lokaal als Blob opslaan bij een collectie.

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { Photo } from '../types';

const MAX_LONG_EDGE = 1800;
const JPEG_QUALITY = 0.82;

/**
 * Verkleint een afbeelding tot maximaal MAX_LONG_EDGE op de lange zijde en
 * levert een JPEG-Blob. Zeer grote foto's worden zo compacter opgeslagen,
 * met behoud van voldoende kwaliteit voor administratie.
 */
export async function resizeImage(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const longEdge = Math.max(width, height);
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

/** Verkleint en koppelt een foto aan een collectie. */
export async function addPhoto(collectionId: string, file: File): Promise<Photo> {
  const blob = await resizeImage(file);
  const photo: Photo = {
    id: uuidv4(),
    collectionId,
    blob,
    fileName: file.name || 'foto.jpg',
    createdAt: new Date().toISOString(),
  };
  await db.photos.put(photo);
  return photo;
}

/** Alle foto's van een collectie, oudste eerst. */
export async function getPhotos(collectionId: string): Promise<Photo[]> {
  const photos = await db.photos.where('collectionId').equals(collectionId).toArray();
  photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return photos;
}

/** Verwijdert één foto. */
export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id);
}
