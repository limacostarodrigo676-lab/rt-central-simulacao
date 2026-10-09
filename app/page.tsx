"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const links = [
  ["INSS", "Beneficiário do INSS"],
  ["Prefeitura", "Servidor municipal"],
  ["CLT", "Trabalhador registrado"],
  ["Servidor Público", "Servidor público"],
];

const values = ["R$ 5 mil", "R$ 10 mil", "R$ 15 mil", "R$ 20 mil", "R$ 30 mil+"];
const parcels = [
  "Até R$ 200",
  "R$ 200 a R$ 300",
  "R$ 300 a R$ 500",
  "R$ 500 a R$ 800",
  "Acima de R$ 800",
];

function encodeForm(data: Record<string, string>) {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");
}

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
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const prefersReducedMotion = useReducedMotion();

  const go = () => {
    setDirection(1);
    setStep((current) => Math.min(4, current + 1));
  };
  const back = () => {
    setDirection(-1);
    setStep((current) => Math.max(1, current - 1));
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
    };
    const results = await Promise.allSettled([
      fetch("/simulador/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeForm(payload),
      }),
      fetch("https://rt-central-simulacao.netlify.app/.netlify/functions/notify-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vinculo: link, valor: value, parcela: parcel, nome: name, whatsapp: phone }),
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
          <img src="/simulador/rt-logo.png" alt="RT Soluções Financeiras" />
        </header>

        <div className="hero">
          <span>ATENDIMENTO ESPECIALIZADO</span>
          <h1>Crédito consignado com condição personalizada.</h1>
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
                        onClick={() => setLink(label)}
                        key={label}
                        type="button"
                      >
                        <b>{label}</b>
                        <span>{description}</span>
                      </button>
                    ))}
                  </div>
                  <button className="primary" disabled={!link} onClick={go}>
                    Começar simulação
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <BackButton onClick={back} />
                  <small>ETAPA 2 DE 4</small>
                  <h2>Quanto você gostaria de consultar?</h2>
                  <p>Escolha uma faixa aproximada.</p>
                  <div className="grid">
                    {values.map((item) => (
                      <button
                        className={value === item ? "choice active" : "choice"}
                        onClick={() => setValue(item)}
                        key={item}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <button className="primary" disabled={!value} onClick={go}>
                    Continuar
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <BackButton onClick={back} />
                  <small>ETAPA 3 DE 4</small>
                  <h2>Qual parcela cabe no seu orçamento?</h2>
                  <p>Essa informação ajuda a direcionar a consulta.</p>
                  <div className="grid">
                    {parcels.map((item) => (
                      <button
                        className={parcel === item ? "choice active" : "choice"}
                        onClick={() => setParcel(item)}
                        key={item}
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <button className="primary" disabled={!parcel} onClick={go}>
                    Continuar
                  </button>
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
