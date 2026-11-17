import { appDenial } from "../../shared/appAccess.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@2.5.2';
import { validateFetchUrl, safeFetch } from '../../shared/validateUrl.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const denied = await appDenial(base44, user, 'hse');
    if (denied) return denied;

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const photos = payload.photos || [];

    if (!Array.isArray(photos) || photos.length > 60) return Response.json({ error: 'Maximum 60 photos par export' }, { status: 413 });
    let remaining = 16 * 1024 * 1024;
    const deadline = AbortSignal.timeout(60000);
    if (photos.length === 0) {
      return Response.json({ error: 'No photos to export' }, { status: 400 });
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('PHOTOS ACCIDENTS - INCIDENT ET PRESQU\'ACCIDENTS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Add separator
    doc.setDrawColor(100);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Image dimensions - smaller to fit more images
    const imgWidth = (contentWidth - 5) / 2;
    const imgHeight = imgWidth * 0.6;
    const rowHeight = imgHeight + 12;

    // Process each photo
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const isLeftColumn = i % 2 === 0;

      // Check if we need a new page (check before starting left column)
      if (isLeftColumn && yPosition + rowHeight > pageHeight - margin - 5) {
        doc.addPage();
        yPosition = margin;
      }

      const xPos = isLeftColumn ? margin : margin + imgWidth + 5;
      const photoYPos = yPosition;

      try {
        // Fetch and add image with extended timeout (SSRF-safe)
        validateFetchUrl(photo.image_url);
        const imageResponse = await safeFetch(photo.image_url, { signal: deadline });
        if (!imageResponse.ok) {
          throw new Error(`Image fetch failed: ${imageResponse.status}`);
        }

        const reader = imageResponse.body?.getReader();
        if (!reader) throw new Error('Image vide');
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          remaining -= value.length;
          if (size > 5 * 1024 * 1024 || remaining < 0) {
            await reader.cancel();
            return Response.json({ error: 'Volume des images dépassé' }, { status: 413 });
          }
          chunks.push(value);
        }
        const imageBlob = new Blob(chunks, { type: imageResponse.headers.get('content-type') || 'image/jpeg' });
        
        // Only process if blob has content
        if (imageBlob.size > 0) {
          const arrayBuffer = await imageBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let base64 = '';
          
          // Convert in chunks to avoid stack overflow
          const chunkSize = 65536;
          for (let j = 0; j < uint8Array.length; j += chunkSize) {
            base64 += String.fromCharCode.apply(null, uint8Array.subarray(j, j + chunkSize));
          }
          
          base64 = btoa(base64);
          const mimeType = imageBlob.type || 'image/jpeg';
          const imageData = `data:${mimeType};base64,${base64}`;

          // Maintain aspect ratio — fit within container, center the image
          let drawW = imgWidth;
          let drawH = imgHeight;
          try {
            const props = doc.getImageProperties(imageData);
            const imgRatio = props.width / props.height;
            const containerRatio = imgWidth / imgHeight;
            if (imgRatio > containerRatio) {
              drawW = imgWidth;
              drawH = imgWidth / imgRatio;
            } else {
              drawH = imgHeight;
              drawW = imgHeight * imgRatio;
            }
          } catch (e) {
            // fallback: use container as-is
          }
          const drawX = xPos + (imgWidth - drawW) / 2;
          const drawY = photoYPos + (imgHeight - drawH) / 2;

          doc.addImage(imageData, 'JPEG', drawX, drawY, drawW, drawH);
        } else {
          throw new Error('Empty image blob');
        }
      } catch (err) {
        if (deadline.aborted) return Response.json({ error: 'Délai maximal dépassé' }, { status: 408 });
        console.error(`Error loading photo ${i} (${photo.title}):`, err.message);
        // Add placeholder for failed images
        doc.setDrawColor(200);
        doc.rect(xPos, photoYPos, imgWidth, imgHeight);
        doc.setFontSize(7);
        doc.text('Image non disponible', xPos + imgWidth / 2, photoYPos + imgHeight / 2, { align: 'center' });
      }

      // Add metadata (title only)
      const metaY = photoYPos + imgHeight + 3;
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text(photo.title || `Photo ${i + 1}`, xPos, metaY, { maxWidth: imgWidth - 2 });

      // Move to next row if right column
      if (!isLeftColumn) {
        yPosition += rowHeight;
      }
    }

    // Get PDF as array buffer
    const pdfData = doc.output('arraybuffer');

    return Response.json({
      success: true,
      pdfData: Array.from(new Uint8Array(pdfData))
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
});