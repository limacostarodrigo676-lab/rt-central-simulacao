"use client";

import { useState } from "react";

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

export default function Home() {
  const [step, setStep] = useState(1);
  const [link, setLink] = useState("");
  const [value, setValue] = useState("");
  const [parcel, setParcel] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  const go = () => setStep((current) => Math.min(4, current + 1));

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

  return (
    <main className="page">
      <section className="shell">
        <header className="header">
          <img src="/simulador/rt-logo.svg" alt="RT Soluções Financeiras" />
        </header>

        <div className="hero">
          <span>ATENDIMENTO ESPECIALIZADO</span>
          <h1>Crédito consignado com condição personalizada.</h1>
          <p>Consulte possibilidades de crédito de forma simples e segura.</p>
        </div>

        <div className="progress">
          <i style={{ width: `${step * 25}%` }} />
        </div>

        {sent ? (
          <div className="card success">
            <div className="check">✓</div>
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
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="card">
                <small>ETAPA 1 DE 4</small>
                <h2>Qual é o seu vínculo?</h2>
                <p>Selecione uma opção para começar.</p>
                <div className="grid">
                  {links.map(([label, description]) => (
                    <button
                      className={link === label ? "choice active" : "choice"}
                      onClick={() => setLink(label)}
                      key={label}
                    >
                      <b>{label}</b>
                      <span>{description}</span>
                    </button>
                  ))}
                </div>
                <button className="primary" disabled={!link} onClick={go}>
                  Começar simulação
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="card">
                <small>ETAPA 2 DE 4</small>
                <h2>Quanto você gostaria de consultar?</h2>
                <p>Escolha uma faixa aproximada.</p>
                <div className="grid">
                  {values.map((item) => (
                    <button
                      className={value === item ? "choice active" : "choice"}
                      onClick={() => setValue(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button className="primary" disabled={!value} onClick={go}>
                  Continuar
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="card">
                <small>ETAPA 3 DE 4</small>
                <h2>Qual parcela cabe no seu orçamento?</h2>
                <p>Essa informação ajuda a direcionar a consulta.</p>
                <div className="grid">
                  {parcels.map((item) => (
                    <button
                      className={parcel === item ? "choice active" : "choice"}
                      onClick={() => setParcel(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button className="primary" disabled={!parcel} onClick={go}>
                  Continuar
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="card">
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
                  {sending ? "Enviando..." : "Enviar consulta"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="trust">
          <b>RT Soluções Financeiras</b>
          <span>Atendimento especializado • Simulação gratuita</span>
        </div>

        <footer>As condições dependem de análise e margem disponível.</footer>
      </section>
    </main>
  );
}
