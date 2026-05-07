/**
 * SEO image checks — parity-faithful port of `apex-worker-do/src/checks/seo-checks.js`
 * lines 82-99 (image alt, lazy loading, dimensions).
 *
 * Note: "Image Lazy Loading" — the free audit's pass condition triggers when
 * imgCount > 3 AND lazyImages === 0 → warn; otherwise pass. We mirror this exactly.
 */
import * as cheerio from "cheerio";
import type { AuditCheck } from "../../radar/types.js";
import type { LocalCheckRunner } from "../types.js";

export const seoImageChecks: LocalCheckRunner = (ctx) => {
  const checks: AuditCheck[] = [];
  const page = ctx.pages[0];
  if (!page || !page.html) return checks;

  const $ = cheerio.load(page.html);
  const images = $("img");
  const imgCount = images.length;

  // Image Alt Text
  let missingAlt = 0;
  images.each((_, img) => {
    const alt = $(img).attr("alt");
    if (alt === undefined || alt === null) missingAlt++;
  });
  if (imgCount === 0) {
    checks.push({
      id: "image-alt-text",
      title: "Image Alt Text",
      category: "SEO",
      status: "pass",
      message: "No images found.",
    });
  } else if (missingAlt === 0) {
    checks.push({
      id: "image-alt-text",
      title: "Image Alt Text",
      category: "SEO",
      status: "pass",
      message: `All ${imgCount} images have alt attributes.`,
    });
  } else {
    checks.push({
      id: "image-alt-text",
      title: "Image Alt Text",
      category: "SEO",
      status: "warn",
      message: `${missingAlt} of ${imgCount} images missing alt text.`,
    });
  }

  // Image Lazy Loading
  const lazyImages = $('img[loading="lazy"]').length;
  if (imgCount > 3 && lazyImages === 0) {
    checks.push({
      id: "image-lazy-loading",
      title: "Image Lazy Loading",
      category: "SEO",
      status: "warn",
      message: `${imgCount} images but no lazy loading.`,
    });
  } else if (imgCount > 0) {
    checks.push({
      id: "image-lazy-loading",
      title: "Image Lazy Loading",
      category: "SEO",
      status: "pass",
      message: `${lazyImages} of ${imgCount} use lazy loading.`,
    });
  } else {
    checks.push({
      id: "image-lazy-loading",
      title: "Image Lazy Loading",
      category: "SEO",
      status: "pass",
      message: "No images to lazy-load.",
    });
  }

  // Image Dimensions
  let imgMissingDim = 0;
  images.each((_, img) => {
    if (!$(img).attr("width") || !$(img).attr("height")) imgMissingDim++;
  });
  if (imgCount === 0) {
    checks.push({
      id: "image-dimensions",
      title: "Image Dimensions",
      category: "SEO",
      status: "pass",
      message: "No images to check.",
    });
  } else if (imgMissingDim === 0) {
    checks.push({
      id: "image-dimensions",
      title: "Image Dimensions",
      category: "SEO",
      status: "pass",
      message: "All images have width/height.",
    });
  } else {
    checks.push({
      id: "image-dimensions",
      title: "Image Dimensions",
      category: "SEO",
      status: "warn",
      message: `${imgMissingDim} images missing dimensions.`,
    });
  }

  return checks;
};
