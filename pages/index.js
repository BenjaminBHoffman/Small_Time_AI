import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const SYSTEM_PROMPT = `You are the AI assistant for Small Time AI, an AI consulting and integration company that helps small businesses adopt AI tools and workflows.

Your role is to:
1. Answer questions about Small Time AI's services (AI consulting, AI tool integration, workflow automation, chatbot setup, staff training)
2. When a user wants to schedule a call:
A. Ask for their name
B. Ask for their email
C. Ask what date they prefer — accept natural formats like "Jun 26" or "July 3". Only allow dates within the next 30 days. If the user requests a date more than 30 days away, politely let them know you can only book up to 30 days in advance and ask them to choose a closer date.
D. Convert their date to YYYY-MM-DD format internally, then fetch available slots by responding with exactly: FETCH_SLOTS:[YYYY-MM-DD]
E. Present the available times to the user in 12-hour format (e.g. 9:00 AM, 2:30 PM). Do not show military time to the user.
F. Once they pick a time, convert everything to ISO 8601 format internally and book it by responding with exactly: BOOK_APPOINTMENT:[name]:[email]:[YYYY-MM-DDTHH:MM:00]:[YYYY-MM-DDTHH:MM:00]
For example: BOOK_APPOINTMENT:John Smith:john@email.com:2026-07-10T09:00:00:2026-07-10T09:30:00
G. Confirm the booking to the user using their name, the friendly date format (e.g. July 10), and 12-hour time (e.g. 9:00 AM)
3. Provide quotes for services — standard packages start at $500 for a basic AI audit, $1,500 for a full integration project, and custom pricing for ongoing retainers
4. Handle customer support questions with clarity and warmth
5. Collect invoice/billing information when a customer is ready to proceed

Keep responses concise, friendly, and professional. You represent a small business that is approachable and knowledgeable. When scheduling or quoting, ask for one piece of information at a time. Appointments are confirmed automatically — do not tell users you need to confirm later. Always end with a helpful next step.
Always respond in plain conversational text. Do not use markdown formatting, bullet points, numbered lists, or bold text. Write in natural flowing sentences and paragraphs only. Exception: when the booking system requires a command like FETCH_SLOTS:[date] or BOOK_APPOINTMENT:[name]:[email]:[startTime]:[endTime], output that command exactly as shown. Do not make up availability. Always fetch real slots before offering times.`;

const QUICK_CHIPS = [
  "Schedule a call",
  "Get a quote",
  "What do you offer?",
  "How does it work?",
];

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm your Small Time AI assistant. I can help you schedule a consultation, get a quote for our services, or answer any questions. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const historyRef = useRef([]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 110) + "px";
    }
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: trimmed },
    ];
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: historyRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json(); // ← was "response.json()", now "res.json()"
      const reply =
        data.reply || "Sorry, I couldn't get a response. Please try again.";

      // Handle slot fetching
      if (reply.startsWith("FETCH_SLOTS:")) {
        const date = reply.split(":")[1];
        const slotsRes = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getSlots", date }),
        });
        const slotsData = await slotsRes.json();
        const slotMessage =
          slotsData.slots.length > 0
            ? `Here are the available times on ${date}: ${slotsData.slots.join(", ")}. Which works best for you?`
            : `Sorry, there are no available slots on ${date}. Would you like to try another date?`;

        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: slotMessage },
        ];
        setMessages((prev) => [...prev, { role: "ai", text: slotMessage }]);
        return;
      }

      // Handle booking
      if (reply.startsWith("BOOK_APPOINTMENT:")) {
        const parts = reply.split(":");
        const name = parts[1];
        const email = parts[2];
        const startTime = parts.slice(3, 6).join(":");
        const endTime = parts.slice(6).join(":");
        const bookRes = await fetch("/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "book",
            name,
            email,
            startTime,
            endTime,
          }),
        });
        const bookData = await bookRes.json();
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: bookData.message },
        ];
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: bookData.message },
        ]);
        return;
      }
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: reply },
      ];
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `Something went wrong: ${err.message}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <Head>
        <title>Small Time AI</title>
        <meta
          name="description"
          content="Bringing AI innovation to small businesses"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* ── Background street scene ── */}
      <div className="bg-scene" aria-hidden="true">
        <svg
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sky */}
          <rect width="1400" height="800" fill="#87CEEB" />
          <rect y="0" width="1400" height="300" fill="#5bb8f5" opacity="0.3" />
          <rect
            y="280"
            width="1400"
            height="200"
            fill="#c8eaff"
            opacity="0.35"
          />
          {/* Sun */}
          <circle cx="1100" cy="90" r="52" fill="#FFE566" />
          <circle cx="1100" cy="90" r="44" fill="#FFD700" />
          <line
            x1="1100"
            y1="20"
            x2="1100"
            y2="5"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1148"
            y1="42"
            x2="1158"
            y2="32"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1170"
            y1="90"
            x2="1185"
            y2="90"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1148"
            y1="138"
            x2="1158"
            y2="148"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1052"
            y1="42"
            x2="1042"
            y2="32"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1030"
            y1="90"
            x2="1015"
            y2="90"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1052"
            y1="138"
            x2="1042"
            y2="148"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          <line
            x1="1100"
            y1="160"
            x2="1100"
            y2="175"
            stroke="#FFD700"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.7"
          />
          {/* Clouds */}
          <ellipse
            cx="180"
            cy="80"
            rx="80"
            ry="32"
            fill="#fff"
            opacity="0.95"
          />
          <ellipse cx="140" cy="88" rx="55" ry="28" fill="#fff" opacity="0.9" />
          <ellipse cx="230" cy="86" rx="60" ry="26" fill="#fff" opacity="0.9" />
          <ellipse
            cx="185"
            cy="70"
            rx="45"
            ry="24"
            fill="#fff"
            opacity="0.95"
          />
          <ellipse cx="560" cy="60" rx="70" ry="28" fill="#fff" opacity="0.9" />
          <ellipse
            cx="520"
            cy="68"
            rx="50"
            ry="24"
            fill="#fff"
            opacity="0.85"
          />
          <ellipse
            cx="610"
            cy="66"
            rx="55"
            ry="22"
            fill="#fff"
            opacity="0.85"
          />
          <ellipse cx="562" cy="50" rx="40" ry="20" fill="#fff" opacity="0.9" />
          <ellipse cx="850" cy="95" rx="65" ry="26" fill="#fff" opacity="0.8" />
          <ellipse
            cx="810"
            cy="103"
            rx="48"
            ry="22"
            fill="#fff"
            opacity="0.75"
          />
          <ellipse
            cx="900"
            cy="100"
            rx="52"
            ry="21"
            fill="#fff"
            opacity="0.75"
          />
          {/* Hills */}
          <ellipse
            cx="0"
            cy="430"
            rx="130"
            ry="100"
            fill="#5a9e3a"
            opacity="0.5"
          />
          <ellipse
            cx="120"
            cy="420"
            rx="110"
            ry="95"
            fill="#4a8e2a"
            opacity="0.4"
          />
          <ellipse
            cx="1280"
            cy="425"
            rx="130"
            ry="100"
            fill="#5a9e3a"
            opacity="0.5"
          />
          <ellipse
            cx="1400"
            cy="415"
            rx="110"
            ry="95"
            fill="#4a8e2a"
            opacity="0.4"
          />
          {/* Ground */}
          <rect x="0" y="490" width="1400" height="310" fill="#5db83a" />
          <rect x="0" y="560" width="1400" height="40" fill="#d4c8a8" />
          <line
            x1="220"
            y1="560"
            x2="220"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1="440"
            y1="560"
            x2="440"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1="660"
            y1="560"
            x2="660"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1="880"
            y1="560"
            x2="880"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1="1100"
            y1="560"
            x2="1100"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          <line
            x1="1320"
            y1="560"
            x2="1320"
            y2="600"
            stroke="#c0b495"
            strokeWidth="1.5"
            opacity="0.7"
          />
          {/* Road */}
          <rect x="0" y="600" width="1400" height="110" fill="#5a5348" />
          <rect
            x="0"
            y="600"
            width="1400"
            height="4"
            fill="#e8d080"
            opacity="0.5"
          />
          <rect
            x="0"
            y="706"
            width="1400"
            height="4"
            fill="#e8d080"
            opacity="0.5"
          />
          <rect
            x="80"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="220"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="360"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="500"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="640"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="780"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="920"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="1060"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="1200"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          <rect
            x="1340"
            y="650"
            width="70"
            height="6"
            fill="#e8d080"
            rx="3"
            opacity="0.8"
          />
          {/* Street lamps */}
          <rect x="198" y="430" width="6" height="135" fill="#7a6e5a" />
          <rect x="188" y="430" width="26" height="7" rx="3" fill="#7a6e5a" />
          <circle cx="191" cy="430" r="5" fill="#c8c070" />
          <rect x="698" y="430" width="6" height="135" fill="#7a6e5a" />
          <rect x="688" y="430" width="26" height="7" rx="3" fill="#7a6e5a" />
          <circle cx="691" cy="430" r="5" fill="#c8c070" />
          <rect x="1198" y="430" width="6" height="135" fill="#7a6e5a" />
          <rect x="1188" y="430" width="26" height="7" rx="3" fill="#7a6e5a" />
          <circle cx="1191" cy="430" r="5" fill="#c8c070" />
          {/* Building 1 — Café */}
          <rect x="30" y="290" width="190" height="270" fill="#e8d4b0" />
          <rect
            x="30"
            y="308"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="328"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="348"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="368"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="388"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="408"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="428"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="448"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="468"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="488"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="508"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="528"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect
            x="30"
            y="548"
            width="190"
            height="3"
            fill="#d4bc94"
            opacity="0.6"
          />
          <rect x="24" y="278" width="202" height="18" fill="#c8a870" rx="2" />
          <rect x="24" y="268" width="202" height="14" fill="#d4b880" rx="2" />
          <rect x="20" y="380" width="210" height="25" rx="3" fill="#cc2828" />
          <rect
            x="20"
            y="380"
            width="30"
            height="25"
            fill="#fff"
            opacity="0.4"
          />
          <rect
            x="68"
            y="380"
            width="30"
            height="25"
            fill="#fff"
            opacity="0.4"
          />
          <rect
            x="116"
            y="380"
            width="30"
            height="25"
            fill="#fff"
            opacity="0.4"
          />
          <rect
            x="164"
            y="380"
            width="30"
            height="25"
            fill="#fff"
            opacity="0.4"
          />
          <line
            x1="20"
            y1="405"
            x2="36"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="36"
            y1="405"
            x2="52"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="52"
            y1="405"
            x2="68"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="68"
            y1="405"
            x2="84"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="84"
            y1="405"
            x2="100"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="100"
            y1="405"
            x2="116"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="116"
            y1="405"
            x2="132"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="132"
            y1="405"
            x2="148"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="148"
            y1="405"
            x2="164"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="164"
            y1="405"
            x2="180"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="180"
            y1="405"
            x2="196"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <line
            x1="196"
            y1="405"
            x2="212"
            y2="418"
            stroke="#aa2020"
            strokeWidth="2"
          />
          <rect x="50" y="284" width="120" height="30" rx="5" fill="#7a2010" />
          <rect x="53" y="287" width="114" height="24" rx="4" fill="#a03018" />
          <text
            x="110"
            y="304"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#ffe8a0"
          >
            CAFÉ
          </text>
          <rect
            x="42"
            y="420"
            width="60"
            height="55"
            rx="4"
            fill="#a8d8f0"
            opacity="0.7"
          />
          <rect
            x="120"
            y="420"
            width="60"
            height="55"
            rx="4"
            fill="#a8d8f0"
            opacity="0.7"
          />
          <rect
            x="42"
            y="420"
            width="60"
            height="55"
            rx="4"
            fill="none"
            stroke="#8a6840"
            strokeWidth="2.5"
          />
          <rect
            x="120"
            y="420"
            width="60"
            height="55"
            rx="4"
            fill="none"
            stroke="#8a6840"
            strokeWidth="2.5"
          />
          <line
            x1="72"
            y1="420"
            x2="72"
            y2="475"
            stroke="#8a6840"
            strokeWidth="1.5"
          />
          <line
            x1="42"
            y1="447"
            x2="102"
            y2="447"
            stroke="#8a6840"
            strokeWidth="1.5"
          />
          <line
            x1="150"
            y1="420"
            x2="150"
            y2="475"
            stroke="#8a6840"
            strokeWidth="1.5"
          />
          <line
            x1="120"
            y1="447"
            x2="180"
            y2="447"
            stroke="#8a6840"
            strokeWidth="1.5"
          />
          <rect x="95" y="490" width="42" height="70" rx="4" fill="#6a3810" />
          <rect
            x="95"
            y="490"
            width="42"
            height="70"
            rx="4"
            fill="none"
            stroke="#4a2408"
            strokeWidth="2"
          />
          <rect
            x="100"
            y="495"
            width="32"
            height="28"
            rx="2"
            fill="#a8d8f0"
            opacity="0.4"
          />
          <circle cx="130" cy="527" r="3.5" fill="#d4a800" />
          <rect x="215" y="510" width="55" height="5" rx="2" fill="#8B5A2B" />
          <rect x="222" y="515" width="8" height="30" rx="2" fill="#8B5A2B" />
          <rect x="253" y="515" width="8" height="30" rx="2" fill="#8B5A2B" />
          <rect x="217" y="496" width="16" height="24" rx="3" fill="#7a4e24" />
          <rect x="250" y="496" width="16" height="24" rx="3" fill="#7a4e24" />
          <rect x="30" y="540" width="20" height="20" rx="3" fill="#a05a28" />
          <ellipse cx="40" cy="538" rx="14" ry="10" fill="#3a8a18" />
          <ellipse cx="40" cy="532" rx="10" ry="8" fill="#4aaa22" />
          <rect x="175" y="540" width="20" height="20" rx="3" fill="#a05a28" />
          <ellipse cx="185" cy="538" rx="14" ry="10" fill="#3a8a18" />
          <ellipse cx="185" cy="532" rx="10" ry="8" fill="#4aaa22" />
          <ellipse cx="125" cy="562" rx="80" ry="6" fill="rgba(0,0,0,0.08)" />
          {/* Building 2 — Barbershop */}
          <rect x="240" y="305" width="175" height="255" fill="#d4e4f8" />
          <rect
            x="240"
            y="322"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="342"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="362"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="382"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="402"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="422"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="442"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="462"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="482"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="502"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="522"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect
            x="240"
            y="542"
            width="175"
            height="2.5"
            fill="#b8cce0"
            opacity="0.6"
          />
          <rect x="232" y="290" width="191" height="20" rx="2" fill="#2a4a8a" />
          <rect x="255" y="295" width="145" height="30" rx="5" fill="#1a3278" />
          <text
            x="327"
            y="315"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#ffffff"
          >
            BARBERSHOP
          </text>
          <rect x="400" y="400" width="16" height="100" rx="8" fill="#f0f0f0" />
          <rect x="402" y="406" width="12" height="14" rx="3" fill="#e03030" />
          <rect x="402" y="428" width="12" height="14" rx="3" fill="#2060c8" />
          <rect x="402" y="450" width="12" height="14" rx="3" fill="#e03030" />
          <rect x="402" y="472" width="12" height="14" rx="3" fill="#2060c8" />
          <rect x="402" y="494" width="12" height="12" rx="3" fill="#e03030" />
          <circle cx="408" cy="400" r="8" fill="#d8d8d8" />
          <circle cx="408" cy="500" r="8" fill="#d8d8d8" />
          <rect
            x="252"
            y="365"
            width="62"
            height="60"
            rx="4"
            fill="#a8d8f0"
            opacity="0.7"
          />
          <rect
            x="330"
            y="365"
            width="62"
            height="60"
            rx="4"
            fill="#a8d8f0"
            opacity="0.7"
          />
          <rect
            x="252"
            y="365"
            width="62"
            height="60"
            rx="4"
            fill="none"
            stroke="#2a5090"
            strokeWidth="2.5"
          />
          <rect
            x="330"
            y="365"
            width="62"
            height="60"
            rx="4"
            fill="none"
            stroke="#2a5090"
            strokeWidth="2.5"
          />
          <line
            x1="283"
            y1="365"
            x2="283"
            y2="425"
            stroke="#2a5090"
            strokeWidth="1.5"
          />
          <line
            x1="252"
            y1="395"
            x2="314"
            y2="395"
            stroke="#2a5090"
            strokeWidth="1.5"
          />
          <line
            x1="361"
            y1="365"
            x2="361"
            y2="425"
            stroke="#2a5090"
            strokeWidth="1.5"
          />
          <line
            x1="330"
            y1="395"
            x2="392"
            y2="395"
            stroke="#2a5090"
            strokeWidth="1.5"
          />
          <rect x="295" y="470" width="44" height="90" rx="4" fill="#1a3278" />
          <rect
            x="295"
            y="470"
            width="44"
            height="90"
            rx="4"
            fill="none"
            stroke="#0e2050"
            strokeWidth="2"
          />
          <rect
            x="300"
            y="475"
            width="34"
            height="30"
            rx="2"
            fill="#a8d8f0"
            opacity="0.5"
          />
          <circle cx="332" cy="518" r="3.5" fill="#d4a800" />
          <ellipse cx="317" cy="562" rx="55" ry="5" fill="rgba(0,0,0,0.07)" />
          {/* Building 3 — Hardware */}
          <rect x="435" y="270" width="205" height="290" fill="#2a5a1a" />
          <line
            x1="458"
            y1="270"
            x2="458"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="481"
            y1="270"
            x2="481"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="504"
            y1="270"
            x2="504"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="527"
            y1="270"
            x2="527"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="550"
            y1="270"
            x2="550"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="573"
            y1="270"
            x2="573"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="596"
            y1="270"
            x2="596"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="619"
            y1="270"
            x2="619"
            y2="560"
            stroke="#1e4412"
            strokeWidth="2"
            opacity="0.5"
          />
          <polygon points="420,270 650,270 625,245 445,245" fill="#1e3a10" />
          <rect x="575" y="218" width="24" height="40" fill="#3a2a1a" />
          <rect x="571" y="214" width="32" height="6" fill="#2a1a0e" rx="2" />
          <rect x="448" y="276" width="178" height="36" rx="5" fill="#e8a800" />
          <rect x="451" y="279" width="172" height="30" rx="4" fill="#f5c000" />
          <text
            x="537"
            y="299"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#3a2000"
          >
            ACE HARDWARE
          </text>
          <rect
            x="445"
            y="335"
            width="185"
            height="115"
            rx="4"
            fill="#c8e8f8"
            opacity="0.55"
          />
          <rect
            x="445"
            y="335"
            width="185"
            height="115"
            rx="4"
            fill="none"
            stroke="#1a3a0e"
            strokeWidth="3"
          />
          <line
            x1="537"
            y1="335"
            x2="537"
            y2="450"
            stroke="#1a3a0e"
            strokeWidth="2.5"
          />
          <line
            x1="445"
            y1="392"
            x2="630"
            y2="392"
            stroke="#1a3a0e"
            strokeWidth="2.5"
          />
          <rect
            x="458"
            y="400"
            width="64"
            height="10"
            rx="5"
            fill="#8a9880"
            opacity="0.9"
          />
          <rect
            x="458"
            y="416"
            width="44"
            height="10"
            rx="5"
            fill="#8a9880"
            opacity="0.7"
          />
          <rect
            x="550"
            y="400"
            width="64"
            height="10"
            rx="5"
            fill="#8a9880"
            opacity="0.9"
          />
          <circle cx="464" cy="360" r="16" fill="#5a8040" opacity="0.9" />
          <circle cx="553" cy="358" r="13" fill="#4a7030" opacity="0.8" />
          <rect
            x="480"
            y="352"
            width="18"
            height="30"
            rx="3"
            fill="#7a5820"
            opacity="0.8"
          />
          <rect x="495" y="462" width="50" height="98" rx="4" fill="#1e3a10" />
          <rect
            x="495"
            y="462"
            width="50"
            height="98"
            rx="4"
            fill="none"
            stroke="#0e2008"
            strokeWidth="2"
          />
          <line
            x1="520"
            y1="462"
            x2="520"
            y2="560"
            stroke="#0e2008"
            strokeWidth="1.5"
          />
          <circle cx="512" cy="513" r="3.5" fill="#d4a800" />
          <circle cx="528" cy="513" r="3.5" fill="#d4a800" />
          <ellipse cx="537" cy="562" rx="65" ry="5" fill="rgba(0,0,0,0.08)" />
          {/* Building 4 — Bakery */}
          <rect x="665" y="295" width="185" height="265" fill="#f5e8d0" />
          <rect
            x="665"
            y="312"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="332"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="352"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="372"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="392"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="412"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="432"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="452"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="472"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="492"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="512"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="532"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect
            x="665"
            y="552"
            width="185"
            height="3"
            fill="#e0cca8"
            opacity="0.7"
          />
          <rect x="658" y="280" width="199" height="20" rx="3" fill="#c89050" />
          <rect x="652" y="368" width="213" height="26" rx="3" fill="#d06820" />
          <rect
            x="652"
            y="368"
            width="30"
            height="26"
            fill="#f0a030"
            opacity="0.6"
          />
          <rect
            x="700"
            y="368"
            width="30"
            height="26"
            fill="#f0a030"
            opacity="0.6"
          />
          <rect
            x="748"
            y="368"
            width="30"
            height="26"
            fill="#f0a030"
            opacity="0.6"
          />
          <rect
            x="796"
            y="368"
            width="30"
            height="26"
            fill="#f0a030"
            opacity="0.6"
          />
          <rect
            x="844"
            y="368"
            width="30"
            height="26"
            fill="#f0a030"
            opacity="0.6"
          />
          <line
            x1="652"
            y1="394"
            x2="668"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="668"
            y1="394"
            x2="684"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="684"
            y1="394"
            x2="700"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="700"
            y1="394"
            x2="716"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="716"
            y1="394"
            x2="732"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="732"
            y1="394"
            x2="748"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="748"
            y1="394"
            x2="764"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="764"
            y1="394"
            x2="780"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="780"
            y1="394"
            x2="796"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="796"
            y1="394"
            x2="812"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="812"
            y1="394"
            x2="828"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="828"
            y1="394"
            x2="844"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <line
            x1="844"
            y1="394"
            x2="860"
            y2="408"
            stroke="#b05818"
            strokeWidth="2"
          />
          <rect x="678" y="285" width="158" height="32" rx="5" fill="#a05010" />
          <text
            x="757"
            y="306"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#ffe8c0"
          >
            SUNRISE BAKERY
          </text>
          <rect
            x="675"
            y="415"
            width="65"
            height="60"
            rx="4"
            fill="#ffe0a0"
            opacity="0.75"
          />
          <rect
            x="758"
            y="415"
            width="65"
            height="60"
            rx="4"
            fill="#ffe0a0"
            opacity="0.75"
          />
          <rect
            x="675"
            y="415"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#8a5820"
            strokeWidth="2.5"
          />
          <rect
            x="758"
            y="415"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#8a5820"
            strokeWidth="2.5"
          />
          <line
            x1="707"
            y1="415"
            x2="707"
            y2="475"
            stroke="#8a5820"
            strokeWidth="1.5"
          />
          <line
            x1="675"
            y1="445"
            x2="740"
            y2="445"
            stroke="#8a5820"
            strokeWidth="1.5"
          />
          <line
            x1="790"
            y1="415"
            x2="790"
            y2="475"
            stroke="#8a5820"
            strokeWidth="1.5"
          />
          <line
            x1="758"
            y1="445"
            x2="823"
            y2="445"
            stroke="#8a5820"
            strokeWidth="1.5"
          />
          <ellipse
            cx="693"
            cy="462"
            rx="14"
            ry="8"
            fill="#c87830"
            opacity="0.9"
          />
          <ellipse
            cx="775"
            cy="462"
            rx="14"
            ry="8"
            fill="#c87830"
            opacity="0.9"
          />
          <rect x="718" y="478" width="44" height="82" rx="4" fill="#8a4810" />
          <rect
            x="718"
            y="478"
            width="44"
            height="82"
            rx="4"
            fill="none"
            stroke="#5a2e08"
            strokeWidth="2"
          />
          <rect
            x="723"
            y="483"
            width="34"
            height="28"
            rx="2"
            fill="#ffe0a0"
            opacity="0.4"
          />
          <circle cx="754" cy="522" r="3.5" fill="#d4a800" />
          <ellipse cx="757" cy="562" rx="65" ry="5" fill="rgba(0,0,0,0.07)" />
          {/* Building 5 — Landscaping */}
          <rect x="875" y="275" width="200" height="285" fill="#3a6a1a" />
          <line
            x1="898"
            y1="275"
            x2="898"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="921"
            y1="275"
            x2="921"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="944"
            y1="275"
            x2="944"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="967"
            y1="275"
            x2="967"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="990"
            y1="275"
            x2="990"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="1013"
            y1="275"
            x2="1013"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="1036"
            y1="275"
            x2="1036"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <line
            x1="1059"
            y1="275"
            x2="1059"
            y2="560"
            stroke="#2a5010"
            strokeWidth="2"
            opacity="0.5"
          />
          <polygon points="860,275 1090,275 1060,248 890,248" fill="#1e3e0a" />
          <rect x="998" y="218" width="24" height="44" fill="#4a3820" />
          <rect x="994" y="214" width="32" height="7" fill="#3a2810" rx="2" />
          <rect x="888" y="280" width="174" height="36" rx="5" fill="#1a5a08" />
          <text
            x="975"
            y="303"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#a8ff60"
          >
            GREEN THUMB CO.
          </text>
          <rect
            x="888"
            y="345"
            width="65"
            height="60"
            rx="4"
            fill="#c8e8a0"
            opacity="0.6"
          />
          <rect
            x="975"
            y="345"
            width="65"
            height="60"
            rx="4"
            fill="#c8e8a0"
            opacity="0.6"
          />
          <rect
            x="888"
            y="345"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#1e4010"
            strokeWidth="2.5"
          />
          <rect
            x="975"
            y="345"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#1e4010"
            strokeWidth="2.5"
          />
          <line
            x1="920"
            y1="345"
            x2="920"
            y2="405"
            stroke="#1e4010"
            strokeWidth="1.5"
          />
          <line
            x1="888"
            y1="375"
            x2="953"
            y2="375"
            stroke="#1e4010"
            strokeWidth="1.5"
          />
          <line
            x1="1007"
            y1="345"
            x2="1007"
            y2="405"
            stroke="#1e4010"
            strokeWidth="1.5"
          />
          <line
            x1="975"
            y1="375"
            x2="1040"
            y2="375"
            stroke="#1e4010"
            strokeWidth="1.5"
          />
          <rect x="940" y="462" width="46" height="98" rx="4" fill="#1e4010" />
          <rect
            x="940"
            y="462"
            width="46"
            height="98"
            rx="4"
            fill="none"
            stroke="#102a08"
            strokeWidth="2"
          />
          <rect
            x="945"
            y="467"
            width="36"
            height="30"
            rx="2"
            fill="#c8e8a0"
            opacity="0.4"
          />
          <circle cx="979" cy="514" r="3.5" fill="#a8c830" />
          <rect x="888" y="403" width="65" height="12" rx="3" fill="#6a3a18" />
          <ellipse cx="900" cy="402" rx="6" ry="7" fill="#e03838" />
          <ellipse cx="914" cy="400" rx="6" ry="9" fill="#e8a820" />
          <ellipse cx="928" cy="402" rx="6" ry="7" fill="#e03838" />
          <ellipse cx="942" cy="400" rx="6" ry="9" fill="#ff6090" />
          <rect x="975" y="403" width="65" height="12" rx="3" fill="#6a3a18" />
          <ellipse cx="988" cy="402" rx="6" ry="7" fill="#e8a820" />
          <ellipse cx="1002" cy="400" rx="6" ry="9" fill="#e03838" />
          <ellipse cx="1016" cy="402" rx="6" ry="7" fill="#ff6090" />
          <ellipse cx="1030" cy="400" rx="6" ry="9" fill="#e8a820" />
          <rect x="861" y="455" width="10" height="105" fill="#5a3a18" />
          <ellipse cx="866" cy="430" rx="36" ry="44" fill="#2a7818" />
          <ellipse cx="866" cy="412" rx="26" ry="32" fill="#3a9828" />
          <rect x="1072" y="468" width="10" height="92" fill="#5a3a18" />
          <ellipse cx="1077" cy="445" rx="34" ry="40" fill="#2a7818" />
          <ellipse cx="1077" cy="428" rx="24" ry="28" fill="#3a9828" />
          <ellipse cx="932" cy="560" rx="22" ry="14" fill="#2a8018" />
          <ellipse cx="932" cy="553" rx="17" ry="12" fill="#3aaa28" />
          <ellipse cx="997" cy="560" rx="22" ry="14" fill="#2a8018" />
          <ellipse cx="997" cy="553" rx="17" ry="12" fill="#3aaa28" />
          <ellipse cx="975" cy="562" rx="68" ry="5" fill="rgba(0,0,0,0.08)" />
          {/* Building 6 — Plumbing */}
          <rect x="1100" y="305" width="185" height="255" fill="#e0e8f8" />
          <rect
            x="1100"
            y="322"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="342"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="362"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="382"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="402"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="422"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="442"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="462"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="482"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="502"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="522"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1100"
            y="542"
            width="185"
            height="2.5"
            fill="#c8d4e8"
            opacity="0.7"
          />
          <rect
            x="1092"
            y="290"
            width="201"
            height="20"
            rx="3"
            fill="#2060b0"
          />
          <rect
            x="1112"
            y="295"
            width="161"
            height="34"
            rx="5"
            fill="#1040a0"
          />
          <text
            x="1192"
            y="317"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="12"
            fontWeight="700"
            fill="#a0d8ff"
          >
            CITY PLUMBING
          </text>
          <rect
            x="1112"
            y="365"
            width="65"
            height="60"
            rx="4"
            fill="#a8d8f0"
            opacity="0.65"
          />
          <rect
            x="1200"
            y="365"
            width="65"
            height="60"
            rx="4"
            fill="#a8d8f0"
            opacity="0.65"
          />
          <rect
            x="1112"
            y="365"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#1a4080"
            strokeWidth="2.5"
          />
          <rect
            x="1200"
            y="365"
            width="65"
            height="60"
            rx="4"
            fill="none"
            stroke="#1a4080"
            strokeWidth="2.5"
          />
          <line
            x1="1144"
            y1="365"
            x2="1144"
            y2="425"
            stroke="#1a4080"
            strokeWidth="1.5"
          />
          <line
            x1="1112"
            y1="395"
            x2="1177"
            y2="395"
            stroke="#1a4080"
            strokeWidth="1.5"
          />
          <line
            x1="1232"
            y1="365"
            x2="1232"
            y2="425"
            stroke="#1a4080"
            strokeWidth="1.5"
          />
          <line
            x1="1200"
            y1="395"
            x2="1265"
            y2="395"
            stroke="#1a4080"
            strokeWidth="1.5"
          />
          <rect
            x="1265"
            y="400"
            width="12"
            height="100"
            rx="6"
            fill="#8090a0"
          />
          <rect x="1258" y="440" width="25" height="10" rx="5" fill="#6a7888" />
          <circle cx="1271" cy="400" r="7" fill="#9aabb8" />
          <circle cx="1271" cy="500" r="7" fill="#9aabb8" />
          <rect x="1152" y="462" width="44" height="98" rx="4" fill="#1040a0" />
          <rect
            x="1152"
            y="462"
            width="44"
            height="98"
            rx="4"
            fill="none"
            stroke="#0a2870"
            strokeWidth="2"
          />
          <rect
            x="1157"
            y="467"
            width="34"
            height="28"
            rx="2"
            fill="#a8d8f0"
            opacity="0.5"
          />
          <circle cx="1188" cy="514" r="3.5" fill="#d4a800" />
          {/* Building 7 — Tax & Books */}
          <rect x="1305" y="318" width="120" height="242" fill="#f0e8f8" />
          <rect
            x="1305"
            y="335"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="355"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="375"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="395"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="415"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="435"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="455"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="475"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="495"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="515"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="535"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1305"
            y="555"
            width="120"
            height="2.5"
            fill="#d8c8e8"
            opacity="0.7"
          />
          <rect
            x="1297"
            y="302"
            width="136"
            height="22"
            rx="3"
            fill="#6030a0"
          />
          <rect
            x="1311"
            y="307"
            width="118"
            height="30"
            rx="4"
            fill="#4a2080"
          />
          <text
            x="1370"
            y="327"
            textAnchor="middle"
            fontFamily="Space Grotesk, sans-serif"
            fontSize="11"
            fontWeight="700"
            fill="#e0c0ff"
          >
            TAX &amp; BOOKS
          </text>
          <rect
            x="1315"
            y="370"
            width="95"
            height="75"
            rx="4"
            fill="#c8a8f0"
            opacity="0.55"
          />
          <rect
            x="1315"
            y="370"
            width="95"
            height="75"
            rx="4"
            fill="none"
            stroke="#6030a0"
            strokeWidth="2.5"
          />
          <line
            x1="1362"
            y1="370"
            x2="1362"
            y2="445"
            stroke="#6030a0"
            strokeWidth="1.5"
          />
          <line
            x1="1315"
            y1="407"
            x2="1410"
            y2="407"
            stroke="#6030a0"
            strokeWidth="1.5"
          />
          <rect x="1342" y="462" width="38" height="98" rx="4" fill="#4a2080" />
          <rect
            x="1342"
            y="462"
            width="38"
            height="98"
            rx="4"
            fill="none"
            stroke="#2a1060"
            strokeWidth="2"
          />
          <rect
            x="1347"
            y="467"
            width="28"
            height="24"
            rx="2"
            fill="#c8a8f0"
            opacity="0.5"
          />
          <circle cx="1372" cy="514" r="3.5" fill="#d4a800" />
          {/* Vehicles */}
          <rect x="70" y="618" width="105" height="36" rx="4" fill="#2a7018" />
          <rect x="70" y="618" width="105" height="10" fill="#1e5810" rx="2" />
          <rect x="175" y="612" width="75" height="42" rx="5" fill="#2a7018" />
          <rect x="183" y="604" width="67" height="14" rx="4" fill="#1e5810" />
          <rect
            x="192"
            y="607"
            width="36"
            height="11"
            rx="3"
            fill="#a8d8f8"
            opacity="0.8"
          />
          <rect
            x="180"
            y="616"
            width="18"
            height="14"
            rx="2"
            fill="#a8d8f8"
            opacity="0.6"
          />
          <rect x="80" y="624" width="32" height="24" rx="3" fill="#1e4810" />
          <circle cx="96" cy="624" r="8" fill="#0e3008" />
          <rect x="118" y="628" width="50" height="16" rx="3" fill="#2a5814" />
          <circle cx="108" cy="656" r="14" fill="#1a1008" />
          <circle cx="108" cy="656" r="6" fill="#2a2010" />
          <circle cx="180" cy="656" r="14" fill="#1a1008" />
          <circle cx="180" cy="656" r="6" fill="#2a2010" />
          <circle cx="228" cy="656" r="14" fill="#1a1008" />
          <circle cx="228" cy="656" r="6" fill="#2a2010" />
          <rect x="580" y="608" width="145" height="50" rx="6" fill="#e8eef8" />
          <rect x="580" y="632" width="145" height="14" fill="#2060c0" />
          <rect x="618" y="596" width="107" height="26" rx="5" fill="#d8e4f4" />
          <rect
            x="633"
            y="600"
            width="50"
            height="18"
            rx="3"
            fill="#6090d0"
            opacity="0.65"
          />
          <rect
            x="588"
            y="612"
            width="22"
            height="18"
            rx="2"
            fill="#6090d0"
            opacity="0.55"
          />
          <circle cx="616" cy="660" r="14" fill="#1a1a1a" />
          <circle cx="616" cy="660" r="6" fill="#2a2a2a" />
          <circle cx="706" cy="660" r="14" fill="#1a1a1a" />
          <circle cx="706" cy="660" r="6" fill="#2a2a2a" />
          <rect
            x="1000"
            y="616"
            width="115"
            height="44"
            rx="6"
            fill="#c83818"
          />
          <rect x="1020" y="606" width="80" height="22" rx="5" fill="#b82e10" />
          <rect
            x="1030"
            y="609"
            width="38"
            height="16"
            rx="3"
            fill="#6090c0"
            opacity="0.7"
          />
          <rect
            x="1006"
            y="619"
            width="24"
            height="16"
            rx="2"
            fill="#6090c0"
            opacity="0.6"
          />
          <circle cx="1022" cy="662" r="13" fill="#1a1008" />
          <circle cx="1022" cy="662" r="5" fill="#2a2010" />
          <circle cx="1100" cy="662" r="13" fill="#1a1008" />
          <circle cx="1100" cy="662" r="5" fill="#2a2010" />
          <ellipse cx="168" cy="668" rx="95" ry="5" fill="rgba(0,0,0,0.12)" />
          <ellipse cx="652" cy="668" rx="80" ry="5" fill="rgba(0,0,0,0.10)" />
          <ellipse cx="1060" cy="668" rx="65" ry="5" fill="rgba(0,0,0,0.10)" />
        </svg>
      </div>

      <div className="bg-overlay" />

      {/* ── Foreground UI ── */}
      <main className="page">
        {/* Logo */}
        <div className="logo-wrap">
          <div className="logo-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="logo-name">
            Small <span>Time</span> AI
          </h1>
          <p className="logo-sub">AI Consulting &amp; Integration</p>
        </div>

        {/* Chat card */}
        <div className="chat-card" role="region" aria-label="AI assistant chat">
          <div className="chat-header">
            <div className="chat-status-dot" aria-hidden="true" />
            <span className="chat-header-text">AI Assistant — online</span>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`msg ${msg.role === "user" ? "user" : "ai"}`}
              >
                <div
                  className={`msg-avatar ${msg.role === "user" ? "uav" : "ai"}`}
                  aria-hidden="true"
                >
                  {msg.role === "user" ? "You" : "AI"}
                </div>
                <div className="msg-bubble">{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div className="msg ai">
                <div className="msg-avatar ai" aria-hidden="true">
                  AI
                </div>
                <div className="msg-bubble">
                  <div className="typing-dots" aria-label="Typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chips" role="group" aria-label="Quick questions">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                className="chip"
                onClick={() => sendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="chat-input-area">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask anything…"
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              aria-label="Type your message"
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading}
              aria-label="Send message"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tagline */}
        <div className="tagline">
          <p>
            Bringing <em>AI innovation</em> to small businesses
          </p>
        </div>

        <footer className="footer">
          &copy; 2026 Small Time AI — Powered by Claude
        </footer>
      </main>

      <style jsx global>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --accent: #1a6fd4;
          --surface: rgba(255, 255, 255, 0.88);
          --border: rgba(26, 111, 212, 0.25);
          --input-bg: rgba(248, 251, 255, 0.95);
          --muted: #5a6e8a;
          --muted-dark: #2c3e58;
          --text: #1a2840;
        }

        html,
        body {
          height: 100%;
          font-family: "Inter", sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .bg-scene {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          background: #87ceeb;
        }

        .bg-scene svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bg-overlay {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.18);
          z-index: 1;
        }

        .page {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1.25rem 3rem;
          color: var(--text);
        }

        .logo-wrap {
          text-align: center;
          margin-bottom: 1.5rem;
          margin-top: 2rem;
        }

        .logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: var(--accent);
          border: 2px solid rgba(255, 255, 255, 0.4);
          margin-bottom: 0.85rem;
          box-shadow: 0 4px 16px rgba(26, 111, 212, 0.35);
        }

        .logo-icon svg {
          width: 26px;
          height: 26px;
        }

        .logo-name {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #fff;
          line-height: 1;
          display: inline-block;
          position: relative;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
        }

        .logo-name span {
          color: #ffe066;
        }

        .logo-name::after {
          content: "";
          display: block;
          position: absolute;
          bottom: -5px;
          left: 0;
          height: 3px;
          width: 100%;
          background: #ffe066;
          border-radius: 2px;
          transform-origin: left;
          transform: scaleX(0);
          animation: drawLine 0.7s 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes drawLine {
          to {
            transform: scaleX(1);
          }
        }

        .logo-sub {
          font-family: "Space Grotesk", sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
          margin-top: 0.85rem;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
        }

        .chat-card {
          width: 100%;
          max-width: 580px;
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow:
            0 8px 40px rgba(26, 111, 212, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(26, 111, 212, 0.12);
          background: rgba(255, 255, 255, 0.6);
        }

        .chat-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
          animation: pulse 2.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }

        .chat-header-text {
          font-family: "Space Grotesk", sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--muted-dark);
        }

        .chat-messages {
          flex: 1;
          min-height: 240px;
          max-height: 320px;
          overflow-y: auto;
          padding: 1.1rem 1.1rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          scroll-behavior: smooth;
          background: rgba(248, 251, 255, 0.5);
        }

        .chat-messages::-webkit-scrollbar {
          width: 3px;
        }
        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(26, 111, 212, 0.2);
          border-radius: 2px;
        }

        .msg {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          animation: fadeUp 0.22s ease forwards;
        }
        .msg.user {
          flex-direction: row-reverse;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          font-family: "Space Grotesk", sans-serif;
        }

        .msg-avatar.ai {
          background: var(--accent);
          color: #fff;
        }
        .msg-avatar.uav {
          background: #e2e8f0;
          color: var(--muted-dark);
        }

        .msg-bubble {
          max-width: 78%;
          padding: 0.6rem 0.9rem;
          border-radius: 13px;
          font-size: 0.875rem;
          line-height: 1.55;
        }

        .msg.ai .msg-bubble {
          background: #fff;
          border: 1px solid rgba(26, 111, 212, 0.12);
          color: var(--text);
          border-top-left-radius: 4px;
        }

        .msg.user .msg-bubble {
          background: var(--accent);
          color: #fff;
          border-top-right-radius: 4px;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
          padding: 0.35rem 0.1rem;
        }
        .typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
          animation: dot 1.2s ease-in-out infinite;
        }
        .typing-dots span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dots span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes dot {
          0%,
          80%,
          100% {
            transform: scale(0.7);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0.6rem 1rem 0.75rem;
          background: rgba(248, 251, 255, 0.5);
        }

        .chip {
          background: rgba(26, 111, 212, 0.07);
          border: 1px solid rgba(26, 111, 212, 0.22);
          color: var(--accent);
          font-size: 0.73rem;
          font-family: "Inter", sans-serif;
          font-weight: 500;
          padding: 5px 11px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .chip:hover {
          background: rgba(26, 111, 212, 0.14);
        }

        .chat-input-area {
          padding: 0.8rem 0.9rem;
          border-top: 1px solid rgba(26, 111, 212, 0.1);
          display: flex;
          gap: 8px;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.7);
        }

        .chat-input {
          flex: 1;
          background: var(--input-bg);
          border: 1.5px solid rgba(26, 111, 212, 0.18);
          border-radius: 10px;
          color: var(--text);
          font-family: "Inter", sans-serif;
          font-size: 0.875rem;
          padding: 0.6rem 0.85rem;
          resize: none;
          outline: none;
          line-height: 1.5;
          min-height: 40px;
          max-height: 110px;
          transition: border-color 0.15s;
        }
        .chat-input::placeholder {
          color: #94a3b8;
        }
        .chat-input:focus {
          border-color: var(--accent);
        }

        .send-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition:
            background 0.15s,
            transform 0.1s;
        }
        .send-btn:hover {
          background: #155db8;
        }
        .send-btn:active {
          transform: scale(0.95);
        }
        .send-btn:disabled {
          background: #c0cfdf;
          cursor: not-allowed;
        }
        .send-btn svg {
          width: 15px;
          height: 15px;
        }

        .tagline {
          margin-top: 1.5rem;
          text-align: center;
        }
        .tagline p {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(0.9rem, 2vw, 1.05rem);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.92);
          letter-spacing: 0.01em;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
        }
        .tagline p em {
          color: #ffe066;
          font-style: normal;
          font-weight: 700;
        }

        .footer {
          margin-top: 2rem;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.55);
          letter-spacing: 0.04em;
          text-align: center;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
        }

        @media (prefers-reduced-motion: reduce) {
          .logo-name::after {
            animation: none;
            transform: scaleX(1);
          }
          .chat-status-dot {
            animation: none;
          }
          .msg {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
