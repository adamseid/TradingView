export const config = {
  api: {
    bodyParser: false,
  },
};

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

function getBackendOrigin() {
  const origin =
    process.env.BACKEND_ORIGIN ||
    process.env.VITE_PROXY_TARGET ||
    process.env.VITE_API_PROXY_TARGET;

  if (!origin) {
    throw new Error(
      "Missing BACKEND_ORIGIN. Set it in Vercel so /api requests can proxy to the backend.",
    );
  }

  return origin.replace(/\/+$/, "");
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function buildTargetUrl(req) {
  const backendOrigin = getBackendOrigin();
  const path = Array.isArray(req.query.path) ? req.query.path.join("/") : "";
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";

  return `${backendOrigin}/api/${path}${query}`;
}

export default async function handler(req, res) {
  try {
    const backendOrigin = getBackendOrigin();
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value == null || HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
        continue;
      }

      if (Array.isArray(value)) {
        headers.set(key, value.join("; "));
      } else {
        headers.set(key, value);
      }
    }

    // Make proxied writes look same-origin to Django's CSRF checks.
    headers.set("origin", backendOrigin);
    headers.set("referer", `${backendOrigin}/`);

    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await readRawBody(req);

    const response = await fetch(buildTargetUrl(req), {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.statusCode = response.status;

    for (const [key, value] of response.headers.entries()) {
      if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        continue;
      }

      res.setHeader(key, value);
    }

    if (typeof response.headers.getSetCookie === "function") {
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        res.setHeader("set-cookie", setCookies);
      }
    } else {
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        res.setHeader("set-cookie", setCookie);
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    res.status(502).json({
      response: {
        status: false,
        message:
          error instanceof Error ? error.message : "API proxy request failed.",
        data: null,
      },
    });
  }
}
