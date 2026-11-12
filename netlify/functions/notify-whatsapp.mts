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

// Regras do material de apoio do parceiro (14/10/2026): parcela maxima = fatura x coeficiente.
// A companhia nao e perguntada ao cliente; e deduzida do estado (confirmar na fatura).
const ENERGY_RULES: Record<string, { company: string; coef?: number; teto: number }> = {
  PR: { company: "COPEL", coef: 2.0, teto: 2300 },
  RS: { company: "RGE", coef: 2.3, teto: 4000 },
  BA: { company: "Coelba", teto: 2400 },
  PE: { company: "Celpe", teto: 2400 },
  RN: { company: "Cosern", teto: 2400 },
  RJ: { company: "Enel RJ", teto: 2700 },
  CE: { company: "Enel CE", teto: 2700 },
};

const brl = (n: number) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Aceita "124", "R$ 124,50", "1.234,56", "124.5".
function parseMoney(raw: string): number | null {
  let s = String(raw || "").replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function estimateEnergy(uf: string, bill: string): string {
  if (uf === "SP") return "Companhia: SP tem CPFL, Enel e Elektro - confirmar na fatura";
  const rule = ENERGY_RULES[uf];
  if (!rule) return "Companhia: estado sem regra no material - verificar atendimento";
  const head = `Provavel ${rule.company} (confirmar na fatura)`;
  const teto = `Teto: ${brl(rule.teto)}`;
  const value = parseMoney(bill);
  if (!rule.coef) return `${head} · sem coeficiente no material · ${teto}`;
  const coef = rule.coef.toFixed(1).replace(".", ",");
  if (!value) return `${head}\nParcela max. estimada: informe a fatura (x${coef}) · ${teto}`;
  return `${head}\nParcela max. estimada (x${coef}): ${brl(value * rule.coef)} · ${teto}`;
}

// No WhatsApp o CPF vai mascarado; o completo fica no Netlify Forms / e-mail.
function maskCpfForChat(cpf: string) {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "-";
}

export default async (req: Request) => {
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

  const {
    vinculo = "-",
    valor = "-",
    parcela = "-",
    nome = "-",
    whatsapp = "-",
    conta_luz = "",
    fatura_anexada = "nao",
    cpf = "",
    idade = "",
    estado = "",
    cidade = "",
  } = body;
  const isLuz = vinculo === "Conta de Luz";
  const estimativa = isLuz ? estimateEnergy(estado, conta_luz) : "";

  const text =
    `Novo lead no simulador RT\n` +
    `Nome: ${nome}\n` +
    `WhatsApp: ${whatsapp}\n` +
    `Vinculo: ${vinculo}\n` +
    (isLuz
      ? `CPF: ${maskCpfForChat(cpf)} · Idade: ${idade || "-"}\n` +
        `Cidade: ${cidade || "-"}/${estado || "-"}\n` +
        `Classificacao: ${valor}\n` +
        `Situacao da conta: ${parcela}\n` +
        `Valor da conta: ${conta_luz || "-"}\n` +
        `${estimativa}\n` +
        `Fatura anexada: ${fatura_anexada === "sim" ? "sim (ver e-mail/Netlify Forms)" : "nao"}`
      : `Valor desejado: ${valor}\n` + `Parcela: ${parcela}`);

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const r = await fetch(url);
    const ok = r.ok;
    const bodyText = await r.text();
    return new Response(JSON.stringify({ ok, status: r.status, bodyText }), {
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
