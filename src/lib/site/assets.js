const manifest = JSON.parse(process.env.SITE_ASSET_MANIFEST || "{}");

// O manifest é fixado pelo Next no build; não depende do relógio nem do Git no servidor.
export function assetUrl(url) {
    return manifest.paths?.[url] || url;
}

export const assetRelease = manifest.version || "";
