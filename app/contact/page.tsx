import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";

const CONTACT_EMAIL = "hello@toolspine.com";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the MemeMusic.fun team — support requests, copyright/takedown notices, business inquiries, and general feedback.",
  alternates: { canonical: "https://mememusic.fun/contact" },
};

export default function ContactPage() {
  return (
    <StaticPage
      title="Contact Us"
      subtitle="Questions, feedback, or a takedown request — here's how to reach us."
    >
      <h2>Email</h2>
      <p>
        The fastest way to reach us is email:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to reply within a few
        business days.
      </p>

      <h2>What to include</h2>
      <ul>
        <li>
          <strong>General support:</strong> tell us what page you were on and what went wrong —
          a link helps a lot.
        </li>
        <li>
          <strong>Copyright / takedown requests:</strong> include a link to the sound or GIF on
          MemeMusic, a description of the content you own, and how we can verify it&rsquo;s yours.
          We take these seriously and will remove infringing content promptly.
        </li>
        <li>
          <strong>Reporting inappropriate content:</strong> if you find a sound or GIF that
          shouldn&rsquo;t be on the site, send us the link and we&rsquo;ll review it.
        </li>
        <li>
          <strong>Business &amp; advertising inquiries:</strong> use the same address and mention
          the nature of your inquiry in the subject line.
        </li>
      </ul>

      <h2>Before you write in</h2>
      <p>
        Check our <Link href="/about">About</Link> page for a quick overview of what MemeMusic is,
        or our <Link href="/privacy-policy">Privacy Policy</Link> and{" "}
        <Link href="/terms-of-service">Terms of Service</Link> for how the site handles data,
        ads, and user-submitted content — your question might already be answered there.
      </p>
    </StaticPage>
  );
}
