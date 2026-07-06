import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";

const CONTACT_EMAIL = "hello@toolspine.com";
const LAST_UPDATED = "July 5, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How MemeMusic.fun collects and uses data, which cookies and analytics tools we use, and how advertising (including Google AdSense) works on this site.",
  alternates: { canonical: "https://mememusic.fun/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <StaticPage title="Privacy Policy" updated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains what information MemeMusic.fun (&ldquo;MemeMusic,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects when you use our website, how we use it, and
        the choices you have. MemeMusic does not require an account or sign-up to browse, play,
        or download sounds and GIFs, so we collect as little personal information as possible.
      </p>

      <h2>Information We Collect</h2>
      <p>
        <strong>Usage data.</strong> Like most websites, we automatically collect information
        sent by your browser when you visit — IP address, browser type and version, device type,
        operating system, pages viewed, time spent, referring URLs, and approximate location
        derived from your IP address. This is collected via the analytics tools listed below.
      </p>
      <p>
        <strong>Content you submit.</strong> If you use the upload feature, we store the audio or
        GIF file you upload along with the name and category you assign to it. We do not require
        an email address, username, or any other personal identifier to upload content.
      </p>
      <p>
        <strong>Interaction data.</strong> Likes, dislikes, downloads, and play counts are tracked
        per sound/GIF to power features like &ldquo;most liked&rdquo; — these are stored in
        aggregate and are not tied to a personal account.
      </p>

      <h2>Cookies</h2>
      <p>
        MemeMusic uses cookies and similar technologies (such as local storage and web beacons) to
        keep the site working and to understand how it&rsquo;s used. Cookies on this site fall
        into two categories:
      </p>
      <ul>
        <li>
          <strong>Analytics cookies</strong> — used by the tools listed below to measure traffic
          and usage patterns.
        </li>
        <li>
          <strong>Advertising cookies</strong> — used by our ad partners, including Google, to
          serve and personalize ads (see &ldquo;Advertising&rdquo; below).
        </li>
      </ul>
      <p>
        You can control or delete cookies through your browser settings. Blocking cookies may
        affect some site functionality, but the soundboard and downloads will still work.
      </p>

      <h2>Analytics Tools We Use</h2>
      <p>We currently use the following third-party analytics services:</p>
      <ul>
        <li><strong>Google Analytics</strong> — traffic and usage measurement.</li>
        <li><strong>Vercel Analytics</strong> — page performance and visit metrics.</li>
        <li><strong>Ahrefs Analytics</strong> — traffic and SEO measurement.</li>
      </ul>
      <p>
        These providers may set their own cookies and process data according to their own privacy
        policies. None of these tools are used to identify you personally.
      </p>

      <h2>Advertising</h2>
      <p>
        MemeMusic.fun displays advertising to help keep the site free to use, including ads served
        by <strong>Google AdSense</strong> and, potentially, other third-party ad networks. These
        advertising partners may use cookies, web beacons, and similar technologies to collect
        information about your visits to this and other websites in order to provide
        advertisements about goods and services that may interest you (&ldquo;personalized
        advertising&rdquo;).
      </p>
      <p>
        Google&rsquo;s use of advertising cookies enables it and its partners to serve ads based
        on your visits to this site and other sites on the Internet. You can opt out of
        personalized advertising by visiting{" "}
        <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>
        . You can also visit{" "}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          www.aboutads.info
        </a>{" "}
        to opt out of participating ad networks more broadly.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        Uploaded audio and GIF files are stored using Firebase Storage, and metadata (names,
        categories, like/download counts) is stored in MongoDB Atlas. These providers process data
        on our behalf and do not use it for their own purposes.
      </p>

      <h2>Children&rsquo;s Privacy</h2>
      <p>
        MemeMusic.fun is not directed at children under 13, and we do not knowingly collect
        personal information from children under 13. If you believe a child has provided us with
        personal information, please <Link href="/contact">contact us</Link> so we can remove it.
      </p>

      <h2>Your Choices</h2>
      <p>
        Since we don&rsquo;t require accounts, most data we hold is anonymous or aggregate. If you
        uploaded content and want it removed, or you have questions about data we may hold about
        you, <Link href="/contact">contact us</Link> and we&rsquo;ll help.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices or
        for legal reasons. We&rsquo;ll update the &ldquo;Last updated&rdquo; date above when we
        do. Continued use of the site after changes means you accept the updated policy.
      </p>

      <h2>Contact Us</h2>
      <p>
        Questions about this policy? Email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
        or visit our <Link href="/contact">Contact page</Link>.
      </p>
    </StaticPage>
  );
}
