export function optimizeCloudinaryUrl(url, width = 500) {
  if (!url) return "";

  if (!url.includes("res.cloudinary.com")) {
    return url;
  }

  if (url.includes("q_auto") || url.includes("f_auto")) {
    return url;
  }

  return url.replace(
    "/image/upload/",
    `/image/upload/w_${width},q_auto,f_auto/`
  );
}