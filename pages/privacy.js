// pages/privacy.js  ->  https://smalltimeai.com/privacy
import Head from "next/head";
import Link from "next/link";

// Before you publish:
// 1. Put the email address people should use for privacy questions here.
const CONTACT_EMAIL = "you@example.com";
// 2. Set this to true if the Google Cloud project behind your Gemini API key has
//    billing turned on. That makes it a paid service, and Google then doesn't
//    use chat content to improve its products. Leave it false otherwise.
const GEMINI_PAID = false;

const EFFECTIVE_DATE = "November 3, 2026";

export default function PrivacyPolicy() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <>
      <Head>
        <title>Privacy Policy | Small Time AI</title>
        <meta
          name="description"
          content="How Small Time AI collects, uses, and protects information on smalltimeai.com, including the AI chat assistant and call booking."
        />
      </Head>

      <div className="privacy">
        <header className="privacy-header">
          <Link
            href="/"
            className="privacy-logo"
            aria-label="Small Time AI home page"
          >
            <span className="privacy-logo-icon" aria-hidden="true">
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
            </span>
            <span className="privacy-logo-name">
              Small <span>Time</span> AI
            </span>
          </Link>
        </header>

        <main className="privacy-card">
          <h1>Privacy Policy</h1>
          <p className="privacy-updated">Effective {EFFECTIVE_DATE}</p>

          <p>
            This policy explains what information Small Time AI (“we” or “us”)
            collects through smalltimeai.com, including our AI chat assistant,
            and how we use and protect it.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Chat messages.</strong> When you use the chat assistant,
              we receive what you type. That can include your name, email
              address, details about your business, and when you’d like to meet.
            </li>
            <li>
              <strong>Booking details.</strong> If you book a discovery call, we
              use your name, email address, and the time you choose to set up
              the appointment.
            </li>
            <li>
              <strong>Emails you send us.</strong> If you contact us by email,
              we receive your address and anything you include.
            </li>
            <li>
              <strong>Technical information.</strong> Like most websites, our
              hosting provider automatically records basic request details, such
              as your IP address, browser type, and the pages you visit, to run
              and secure the site.
            </li>
          </ul>
          <p>
            We never ask for payment details in the chat. Please don’t enter
            card numbers, passwords, or other sensitive information there.
          </p>

          <h2>How the chat assistant works</h2>
          <p>
            Our chat assistant runs on Google’s Gemini API. Each time you send a
            message, our server sends the recent conversation to Google to
            generate a reply. We don’t save chat conversations ourselves: they
            live in your browser tab and are cleared when you close or reload
            the page. By sending a message, you agree to this processing.
          </p>
          {GEMINI_PAID ? (
            <p>
              Google processes chat content on our behalf. Under its terms for
              paid Gemini API services, Google doesn’t use this content to
              improve its products and keeps it only for a limited time to
              detect misuse. See the{" "}
              <a href="https://ai.google.dev/gemini-api/terms">
                Gemini API terms
              </a>{" "}
              and{" "}
              <a href="https://policies.google.com/privacy">
                Google’s Privacy Policy
              </a>
              .
            </p>
          ) : (
            <p>
              Google processes chat content under its{" "}
              <a href="https://ai.google.dev/gemini-api/terms">
                Gemini API terms
              </a>{" "}
              and{" "}
              <a href="https://policies.google.com/privacy">Privacy Policy</a>.
              Under those terms, Google may use chat content to provide and
              improve its products and services, and people at Google may review
              it as part of that work.
            </p>
          )}

          <h2>How we use Google Calendar</h2>
          <p>
            To show open times and book calls, our website connects to Small
            Time AI’s own Google account through the Google Calendar API. It
            reads free/busy information from our calendar to find open times,
            and it creates calendar events with Google Meet links for the calls
            you book. Google then emails you the invitation.
          </p>
          <p>
            You never sign in with Google on our site, and we don’t access your
            Google account or any of your Google data.
          </p>
          <p>
            We use calendar access only to schedule and manage consultations. We
            don’t keep copies of calendar data on our servers or share it with
            anyone: we check availability when you ask, and booked calls live in
            our Google Calendar. Small Time AI’s use and transfer to any other
            app of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h2>How we use your information</h2>
          <ul>
            <li>To answer your questions and tell you about our services.</li>
            <li>
              To schedule and hold discovery calls, and to follow up with you
              about your inquiry.
            </li>
            <li>To run, maintain, and secure the website.</li>
          </ul>
          <p>
            We don’t sell or rent your personal information, share it with
            others for their own marketing, or use it for advertising.
          </p>

          <h2>Who we share it with</h2>
          <p>
            We share information only with the service providers that help us
            run the site:
          </p>
          <ul>
            <li>
              Google, for the Gemini API (the chat assistant), Google Calendar
              and Google Meet (booking), and Google Fonts (the fonts on our
              pages).
            </li>
            <li>Our website hosting provider.</li>
          </ul>
          <p>
            We may also disclose information if the law requires it, or to
            protect our rights or someone’s safety. Our service providers may
            process information in the United States and other countries where
            they operate.
          </p>

          <h2>Cookies, tracking, and Do Not Track</h2>
          <p>
            We don’t use cookies, analytics, or advertising trackers, and we
            don’t track your activity over time or across other websites.
            Because we don’t do that kind of tracking, our site works the same
            way whether or not your browser sends a Do Not Track signal.
          </p>
          <p>
            Our pages load fonts from Google Fonts, so your browser connects to
            Google’s servers, which receive your IP address and browser details
            when the fonts load. Apart from that and the chat and booking
            services described above, no other companies collect information
            about your visit through our site.
          </p>

          <h2>How long we keep it</h2>
          <ul>
            <li>
              <strong>Chat conversations:</strong> we don’t store them. Google
              handles them as described above.
            </li>
            <li>
              <strong>Booking details:</strong> kept in our calendar as a
              business record until we no longer need them, or until you ask us
              to delete them.
            </li>
            <li>
              <strong>Technical logs:</strong> kept by our hosting provider for
              a limited time.
            </li>
          </ul>

          <h2>Your choices</h2>
          <p>
            You can ask us to access, correct, or delete the personal
            information we hold about you, or to cancel a call you’ve booked, by
            emailing {email}. Depending on where you live, you may have other
            rights under local law, and we’ll honor those requests as the law
            requires.
          </p>

          <h2>Security</h2>
          <p>
            We protect your information with reasonable safeguards, including
            encrypted connections and limited access to our accounts. No method
            of sending or storing information is completely secure, though, so
            we can’t guarantee absolute security.
          </p>

          <h2>Children</h2>
          <p>
            Our website is meant for businesses and isn’t directed to anyone
            under 18. We don’t knowingly collect information from children.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we change this policy, we’ll post the new version on this page
            and update the effective date at the top.
          </p>

          <h2>Contact us</h2>
          <p>Questions about this policy or your information? Email {email}.</p>

          <p className="privacy-back">
            <Link href="/">Back to Small Time AI</Link>
          </p>
        </main>

        <footer className="privacy-footer">&copy; 2026 Small Time AI</footer>
      </div>

      <style jsx global>{`
        html body {
          background: #87ceeb;
        }

        .privacy {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2.5rem 1.25rem 3rem;
          background: linear-gradient(
            180deg,
            #87ceeb 0%,
            #bfe6fb 40%,
            #e9f6ff 100%
          );
          color: #1a2840;
          font-family: "Inter", sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .privacy-header {
          margin-bottom: 1.75rem;
        }

        .privacy-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          color: #fff;
          text-decoration: none;
          border-radius: 14px;
        }

        .privacy-logo:focus-visible {
          outline: 3px solid #fff;
          outline-offset: 6px;
        }

        .privacy-logo-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #1a6fd4;
          border: 2px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 16px rgba(26, 111, 212, 0.35);
        }

        .privacy-logo-icon svg {
          width: 22px;
          height: 22px;
        }

        .privacy-logo-name {
          position: relative;
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
        }

        .privacy-logo-name span {
          color: #ffe066;
        }

        .privacy-logo-name::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -5px;
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: #ffe066;
        }

        .privacy-card {
          width: 100%;
          max-width: 680px;
          padding: 2.75rem 3rem;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(26, 111, 212, 0.18);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(26, 72, 140, 0.15);
        }

        .privacy-card h1 {
          font-family: "Space Grotesk", sans-serif;
          font-size: 2.25rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .privacy-card .privacy-updated {
          margin: 0.5rem 0 1.75rem;
          font-size: 0.9rem;
          color: #5a6e8a;
        }

        .privacy-card h2 {
          margin: 2.25rem 0 0.6rem;
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .privacy-card p,
        .privacy-card li {
          font-size: 1rem;
          line-height: 1.7;
        }

        .privacy-card p + p,
        .privacy-card p + ul,
        .privacy-card ul + p {
          margin-top: 0.85rem;
        }

        .privacy-card ul {
          padding-left: 1.25rem;
        }

        .privacy-card li + li {
          margin-top: 0.5rem;
        }

        .privacy-card li::marker {
          color: #1a6fd4;
        }

        .privacy-card strong {
          font-weight: 600;
        }

        .privacy-card a {
          color: #1a6fd4;
          text-decoration: underline;
          text-underline-offset: 2px;
          overflow-wrap: anywhere;
        }

        .privacy-card a:hover {
          color: #0f4f9e;
        }

        .privacy-card a:focus-visible {
          outline: 2px solid #1a6fd4;
          outline-offset: 2px;
          border-radius: 3px;
        }

        .privacy-card .privacy-back {
          margin-top: 2.5rem;
          font-weight: 500;
        }

        .privacy-footer {
          margin-top: 2rem;
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          color: rgba(26, 40, 64, 0.6);
        }

        @media (max-width: 600px) {
          .privacy {
            padding-top: 1.75rem;
          }

          .privacy-card {
            padding: 1.75rem 1.4rem;
            border-radius: 16px;
          }

          .privacy-card h1 {
            font-size: 1.85rem;
          }
        }
      `}</style>
    </>
  );
}
