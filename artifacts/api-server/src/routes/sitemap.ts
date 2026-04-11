import { Router, type IRouter } from "express";
import { db, listingsTable, jobPostingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();
const BASE_URL = "https://millaburos.com";

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const listings = await db
      .select({ id: listingsTable.id, updatedAt: listingsTable.updatedAt })
      .from(listingsTable)
      .where(and(eq(listingsTable.isActive, true), eq(listingsTable.adminApproved, true)))
      .orderBy(desc(listingsTable.updatedAt));

    const jobs = await db
      .select({ id: jobPostingsTable.id, updatedAt: jobPostingsTable.updatedAt })
      .from(jobPostingsTable)
      .where(and(eq(jobPostingsTable.isActive, true), eq(jobPostingsTable.adminApproved, true)))
      .orderBy(desc(jobPostingsTable.updatedAt));

    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${now}</lastmod>
  </url>
  <url>
    <loc>${BASE_URL}/servicios</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${now}</lastmod>
  </url>
  <url>
    <loc>${BASE_URL}/trabajos</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
    <lastmod>${now}</lastmod>
  </url>
  <url>
    <loc>${BASE_URL}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${BASE_URL}/register</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${BASE_URL}/terminos</loc>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>`;

    for (const listing of listings) {
      const lastmod = listing.updatedAt.toISOString().split("T")[0];
      xml += `
  <url>
    <loc>${BASE_URL}/servicio/${listing.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    }

    for (const job of jobs) {
      const lastmod = job.updatedAt.toISOString().split("T")[0];
      xml += `
  <url>
    <loc>${BASE_URL}/trabajo/${job.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    }

    xml += `
</urlset>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch {
    res.status(500).set("Content-Type", "application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`
    );
  }
});

export default router;
