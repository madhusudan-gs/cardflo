export async function cropImage(
    base64Image: string,
    box: [number, number, number, number], // [ymin, xmin, ymax, xmax] normalized to 1000
    paddingRatio: number = 0
): Promise<string | null> {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // De-normalize coordinates based on actual image dimensions
                const width = img.width;
                const height = img.height;

                const [ymin, xmin, ymax, xmax] = box;

                const startY = (ymin / 1000) * height;
                const startX = (xmin / 1000) * width;
                const endY = (ymax / 1000) * height;
                const endX = (xmax / 1000) * width;

                const cropWidth = endX - startX;
                const cropHeight = endY - startY;

                // Validate box
                if (cropWidth <= 0 || cropHeight <= 0) {
                    resolve(null);
                    return;
                }

                // Add requested padding
                const padX = cropWidth * paddingRatio;
                const padY = cropHeight * paddingRatio;

                const finalX = Math.max(0, startX - padX);
                const finalY = Math.max(0, startY - padY);
                const finalWidth = Math.min(width - finalX, cropWidth + (padX * 2));
                const finalHeight = Math.min(height - finalY, cropHeight + (padY * 2));

                canvas.width = finalWidth;
                canvas.height = finalHeight;

                // Draw the cropped section onto the new canvas
                ctx.drawImage(
                    img,
                    finalX, finalY, finalWidth, finalHeight, // Source Rect
                    0, 0, finalWidth, finalHeight            // Destination Rect
                );

                // Convert to compressed jpeg base64
                const croppedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(croppedBase64);
            };

            img.onerror = () => {
                resolve(null);
            };

            img.src = base64Image;

        } catch (e) {
            console.error("Cropping failed:", e);
            resolve(null);
        }
    });
}

export async function cropLogoFromImage(base64Image: string, logoBox: [number, number, number, number]): Promise<string | null> {
    return cropImage(base64Image, logoBox, 0.1);
}
