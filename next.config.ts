import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
<<<<<<< HEAD
  // pdfkit reads its standard-14 font metrics (.afm files) from disk at runtime.
  // Vercel's file tracing doesn't pick these up automatically since they're
  // loaded dynamically (fs.readFileSync), not statically imported — without this,
  // the PDF export route crashes in production with ENOENT on Helvetica.afm.
=======
>>>>>>> 877279009d1c8217d1d91c3749af9ba78e6eafa3
  outputFileTracingIncludes: {
    "/api/export/pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
