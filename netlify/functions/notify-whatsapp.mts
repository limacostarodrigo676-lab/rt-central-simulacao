import type { Context } from "@netlify/functions";

const ALLOWED_ORIGINS = new Set([
  "https://rtsolucoesfinanceira.com.br",
  "https://rt-central-simulacao.netlify.app",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://rtsolucoesfinanceira.com.br";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async (req: Request, _context: Context) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers });
  }

  const phone = Netlify.env.get("CALLMEBOT_PHONE");
  const apikey = Netlify.env.get("CALLMEBOT_APIKEY");

  if (!phone || !apikey) {
    console.error("notify-whatsapp: faltam CALLMEBOT_PHONE / CALLMEBOT_APIKEY nas env vars do site.");
    // Não derruba o fluxo do lead por falta de configuração — só loga.
    return new Response(JSON.stringify({ ok: false, reason: "not_configured" }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, string> = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers });
  }

  const { vinculo = "-", valor = "-", parcela = "-", nome = "-", whatsapp = "-" } = body;

  const text =
    `Novo lead no simulador RT\n` +
    `Nome: ${nome}\n` +
    `WhatsApp: ${whatsapp}\n` +
    `Vinculo: ${vinculo}\n` +
    `Valor desejado: ${valor}\n` +
    `Parcela: ${parcela}`;

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const r = await fetch(url);
    const ok = r.ok;
    return new Response(JSON.stringify({ ok }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-whatsapp: erro chamando CallMeBot", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
};
