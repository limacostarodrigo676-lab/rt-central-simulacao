"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const links = [
  ["INSS", "Beneficiário do INSS"],
  ["Conta de Luz", "Crédito parcelado na fatura de energia"],
  ["Cartão Consignado", "Desconto direto na folha/benefício"],
  ["Prefeitura", "Servidor municipal"],
  ["CLT", "Trabalhador registrado"],
  ["Servidor Público", "Servidor público"],
];

const LUZ = "Conta de Luz";

// Regras do material de apoio Crefaz (14/10/2026). Os tetos dependem da
// companhia e do perfil do cliente — por isso o texto sempre diz "até".
const energyCompanies = [
  { label: "COPEL", description: "Paraná", max: "R$ 2.300" },
  { label: "CPFL / RGE", description: "CPFL Paulista, Piratininga, Santa Cruz e RGE", max: "R$ 4.000" },
  { label: "Neoenergia", description: "Elektro, Coelba, Celpe e Cosern", max: "R$ 2.400" },
  { label: "Enel", description: "Enel SP, RJ e CE", max: "R$ 2.700" },
  { label: "Outra companhia", description: "Vamos verificar se atendemos", max: "" },
];
const energySituations = [
  ["No meu nome e em dia", "Sem faturas atrasadas"],
  ["No meu nome, com atraso", "Uma ou mais faturas vencidas"],
  ["No nome de outra pessoa", "Familiar, cônjuge ou proprietário"],
];

const values = ["R$ 5 mil", "R$ 10 mil", "R$ 15 mil", "R$ 20 mil", "R$ 30 mil+"];
const cardValues = [
  "Até R$ 1.000",
  "Até R$ 2.000",
  "Até R$ 3.000",
  "Mais de R$ 3.000",
  "Refinanciamento",
  "Cartão com saque complementar",
];
const parcels = [
  "Até R$ 200",
  "R$ 200 a R$ 300",
  "R$ 300 a R$ 500",
  "R$ 500 a R$ 800",
  "Acima de R$ 800",
];

const MAX_FILE_BYTES = 8 * 1024 * 1024; // limite do Netlify Forms por envio

function encodeForm(data: Record<string, string>) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");
}

const highlighted = ["INSS", "Cartão Consignado"];

const icons: Record<string, ReactNode> = {
  INSS: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "Cartão Consignado": (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  Prefeitura: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 14V6l6-3.5L14 6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  CLT: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="5" width="13" height="8.3" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 5V3.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3V5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  [LUZ]: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.8a4.4 4.4 0 0 0-2.6 8c.5.4.8.9.8 1.5v.5h3.6v-.5c0-.6.3-1.1.8-1.5A4.4 4.4 0 0 0 8 1.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.3 14.2h3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  "Servidor Público": (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.6 13.5 3.6v4.1c0 3.4-2.3 5.9-5.5 6.7-3.2-.8-5.5-3.3-5.5-6.7V3.6L8 1.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5.8 8l1.6 1.6 3-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back" onClick={onClick} type="button" aria-label="Voltar para a etapa anterior">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Voltar
    </button>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [link, setLink] = useState("");
  const [value, setValue] = useState("");
  const [parcel, setParcel] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bill, setBill] = useState("");
  const [billFile, setBillFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const prefersReducedMotion = useReducedMotion();
  const isLuz = link === LUZ;
  const company = energyCompanies.find((item) => item.label === value);

  const go = () => {
    setDirection(1);
    setStep((current) => Math.min(4, current + 1));
  };
  const back = () => {
    setDirection(-1);
    setStep((current) => Math.max(1, current - 1));
  };

  // Seleciona a opção e já avança a etapa sozinho (um clique só) — o pequeno
  // atraso é só pra dar tempo do usuário ver o card ficar verde antes de
  // trocar de tela.
  const selectAndGo = (setter: (value: string) => void, item: string) => {
    setter(item);
    window.setTimeout(go, 180);
  };

  async function submitLead() {
    setSending(true);
    setSendError(false);
    const payload = {
      "form-name": "simulador-lead",
      vinculo: link,
      valor: value,
      parcela: parcel,
      nome: name,
      whatsapp: phone,
      conta_luz: isLuz ? bill : "",
    };
    const results = await Promise.allSettled([
      isLuz && billFile
        ? fetch("/simulador/__forms.html", {
            method: "POST",
            body: (() => {
              const data = new FormData();
              Object.entries(payload).forEach(([key, val]) => data.append(key, val));
              data.append("fatura", billFile);
              return data;
            })(),
          })
        : fetch("/simulador/__forms.html", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeForm(payload),
          }),
      fetch("https://rt-central-simulacao.netlify.app/.netlify/functions/notify-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vinculo: link,
          valor: value,
          parcela: parcel,
          nome: name,
          whatsapp: phone,
          conta_luz: isLuz ? bill : "",
          fatura_anexada: isLuz && billFile ? "sim" : "nao",
        }),
      }),
    ]);
    const emailFailed = results[0].status === "rejected" || (results[0].status === "fulfilled" && !results[0].value.ok);
    if (emailFailed) {
      console.error("Falha ao enviar lead para o Netlify Forms");
      setSendError(true);
    }
    // Falha no aviso de WhatsApp não bloqueia o fluxo nem mostra erro pro lead;
    // o Netlify Forms (e-mail) é o canal garantido.
    setSending(false);
    setSent(true);
  }

  const stepVariants = {
    enter: (dir: number) => ({ x: prefersReducedMotion ? 0 : dir > 0 ? 28 : -28, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: prefersReducedMotion ? 0 : dir > 0 ? -28 : 28, opacity: 0 }),
  };
  const stepTransition = prefersReducedMotion
    ? { duration: 0.12 }
    : { type: "spring" as const, bounce: 0, duration: 0.38 };

  return (
    <main className="page">
      <section className="shell">
        <header className="header">
          <img src="/simulador/rt-logo.png" alt="RT Soluções Financeiras" className="logo-main" />
          <div className="partner">
            <span>Parceiro</span>
            <img src="/simulador/pentagono-logo.png" alt="Pentágono Soluções Financeiras" />
          </div>
        </header>

        <div className="hero">
          <span>ATENDIMENTO ESPECIALIZADO</span>
          <h1>Seu próximo passo para uma vida financeira mais tranquila.</h1>
          <p>Consulte possibilidades de crédito de forma simples e segura.</p>
        </div>

        {!sent && (
          <div className="progress">
            <motion.i
              animate={{ width: `${step * 25}%` }}
              transition={prefersReducedMotion ? { duration: 0.12 } : { type: "spring", bounce: 0, duration: 0.4 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {sent ? (
            <motion.div
              key="success"
              className="card success"
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stepTransition}
            >
              <motion.div
                className="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0.12 }
                    : { type: "spring", bounce: 0.3, duration: 0.5, delay: 0.05 }
                }
              >
                ✓
              </motion.div>
              <small>CONSULTA RECEBIDA</small>
              <h2>Recebemos seus dados.</h2>
              <p>
                Um consultor poderá entrar em contato para dar continuidade à
                consulta. O preenchimento não garante aprovação ou contratação.
              </p>
              {sendError && (
                <p className="warn">
                  Não conseguimos confirmar o envio automático — se não formos
                  contato em breve, chama no WhatsApp.
                </p>
              )}
              <button className="primary" onClick={() => window.location.reload()}>
                Nova consulta
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              className="card"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
            >
              {step === 1 && (
                <>
                  <small>ETAPA 1 DE 4</small>
                  <h2>Qual é o seu vínculo?</h2>
                  <p>Selecione uma opção para começar.</p>
                  <div className="grid">
                    {links.map(([label, description]) => (
                      <button
                        className={link === label ? "choice active" : "choice"}
                        onClick={() => {
                          if (label !== link) {
                            setValue("");
                            setParcel("");
                          }
                          selectAndGo(setLink, label);
                        }}
                        key={label}
                        type="button"
                      >
                        {highlighted.includes(label) && (
                          <span className="choice-badge">Mais procurado</span>
                        )}
                        <span className="choice-icon">{icons[label]}</span>
                        <b>{label}</b>
                        <span>{description}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <BackButton onClick={back} />
                  <small>ETAPA 2 DE 4</small>
                  <h2>
                    {isLuz
                      ? "Qual é a sua companhia de energia?"
                      : link === "Cartão Consignado"
                        ? "Qual valor ou operação você procura?"
                        : "Quanto você gostaria de consultar?"}
                  </h2>
                  <p>
                    {isLuz
                      ? "É a empresa que aparece na sua conta de luz."
                      : link === "Cartão Consignado"
                        ? "Escolha uma opção abaixo."
                        : "Escolha uma faixa aproximada."}
                  </p>
                  {isLuz && (
                    <div className="grid">
                      {energyCompanies.map((item) => (
                        <button
                          className={value === item.label ? "choice active" : "choice"}
                          onClick={() => selectAndGo(setValue, item.label)}
                          key={item.label}
                          type="button"
                        >
                          <b>{item.label}</b>
                          <span>{item.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!isLuz && (
                  <div className="grid">
                    {(link === "Cartão Consignado" ? cardValues : values).map((item) => (
                      <button
                        className={value === item ? "choice active" : "choice"}
                        onClick={() => selectAndGo(setValue, item)}
                        key={item}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  )}
                </>
              )}

              {step === 3 && isLuz && (
                <>
                  <BackButton onClick={back} />
                  <small>ETAPA 3 DE 4</small>
                  <h2>Como está a sua conta de luz?</h2>
                  <p>
                    {company?.max
                      ? `Na ${company.label}, o crédito pode chegar a até ${company.max}, conforme o perfil e a análise de crédito.`
                      : "Um consultor vai confirmar se a sua companhia é atendida."}
                  </p>
                  <div className="grid">
                    {energySituations.map(([label, description]) => (
                      <button
                        className={parcel === label ? "choice active" : "choice"}
                        onClick={() => selectAndGo(setParcel, label)}
                        key={label}
                        type="button"
                      >
                        <b>{label}</b>
                        <span>{description}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && !isLuz && (
                <>
                  <BackButton onClick={back} />
                  <small>ETAPA 3 DE 4</small>
                  <h2>Qual parcela cabe no seu orçamento?</h2>
                  <p>Essa informação ajuda a direcionar a consulta.</p>
                  <div className="grid">
                    {parcels.map((item) => (
                      <button
                        className={parcel === item ? "choice active" : "choice"}
                        onClick={() => selectAndGo(setParcel, item)}
                        key={item}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <BackButton onClick={back} />
                  <small>ÚLTIMA ETAPA</small>
                  <h2>Como podemos falar com você?</h2>
                  <p>Preencha seus dados para continuar.</p>
                  <label>
                    Nome
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Seu nome"
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                    />
                  </label>
                  {isLuz && (
                    <>
                      <label>
                        Valor da última conta de luz (opcional)
                        <input
                          value={bill}
                          onChange={(event) => setBill(event.target.value)}
                          placeholder="Ex.: R$ 150"
                          inputMode="decimal"
                        />
                      </label>
                      <label className={billFile ? "upload done" : "upload"}>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (file && file.size > MAX_FILE_BYTES) {
                              setFileError("Arquivo muito grande. Envie uma foto ou PDF de até 8 MB.");
                              setBillFile(null);
                              event.target.value = "";
                              return;
                            }
                            setFileError("");
                            setBillFile(file);
                          }}
                        />
                        <span className="upload-icon" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M9 12V3M5.5 6.5 9 3l3.5 3.5M3 12.5v1.7c0 .7.6 1.3 1.3 1.3h9.4c.7 0 1.3-.6 1.3-1.3v-1.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="upload-text">
                          <b>{billFile ? billFile.name : "Anexar a conta de luz (opcional)"}</b>
                          <span>{billFile ? "Toque para trocar o arquivo" : "Foto ou PDF da última fatura — agiliza a análise"}</span>
                        </span>
                      </label>
                      {fileError && <p className="warn">{fileError}</p>}
                      <p className="note">
                        {parcel === "No nome de outra pessoa"
                          ? "Essa modalidade exige que a conta esteja no nome de quem contrata. Um consultor vai te explicar as alternativas."
                          : "Requisitos: ser titular da conta, ter de 21 a 84 anos e contratar pelo celular, com selfie e assinatura digital. Sujeito a análise de crédito."}
                      </p>
                    </>
                  )}
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    Concordo com o contato referente a esta solicitação e com o
                    tratamento dos dados conforme a política de privacidade.
                  </label>
                  <button
                    className="primary"
                    disabled={!name || !phone || !consent || sending}
                    onClick={submitLead}
                  >
                    {sending ? (
                      <>
                        Enviando
                        <span className="dots">
                          <span />
                          <span />
                          <span />
                        </span>
                      </>
                    ) : (
                      "Enviar consulta"
                    )}
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="trust">
          <b>RT Soluções Financeiras</b>
          <span>Atendimento especializado • Simulação gratuita</span>
        </div>

        <div className="institutional">
          <div className="inst-card">
            <h3>Mais possibilidades para você</h3>
            <p>
              Trabalhamos com <span className="stat-number">43 bancos parceiros</span>,
              ampliando as possibilidades de encontrar uma solução adequada ao
              seu perfil.
            </p>
          </div>

          <div className="inst-card compromisso">
            <h3>Compromisso com o mercado financeiro</h3>
            <p>
              Atuamos em conformidade com as práticas do setor financeiro e
              mantemos vínculo associativo com a FEBRABAN (Federação
              Brasileira de Bancos), reforçando o compromisso com a
              transparência e a ética na intermediação de crédito.
            </p>
          </div>

          <div className="welcome">
            <span className="welcome-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3 8.6c0-3 2.6-5.4 6-5.4s6 2.4 6 5.4c0 3-2.6 5.4-6 5.4-.8 0-1.6-.14-2.3-.4L3 14.6l1-2.7A5 5 0 0 1 3 8.6Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="welcome-text">
              <b>Atendimento especializado e acolhedor</b>
              <span>
                Nossa equipe te acompanha do início ao fim da consulta, com
                clareza e sem pressa, para encontrar o que faz sentido pra
                você.
              </span>
            </span>
          </div>
        </div>

        <footer>
          <div className="footer-contact">
            <span>R. Pres. Getúlio Vargas, 180 · Sala 07 · Mandaguaçu – PR</span>
            <span>(44) 99184-8645</span>
          </div>
          <p>As condições dependem de análise e margem disponível.</p>
        </footer>
      </section>
    </main>
  );
}
