import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";

const CONTACT_EMAIL = "hello@toolspine.com";
const LAST_UPDATED = "July 5, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of MemeMusic.fun, including user uploads, prohibited use, disclaimers, and governing law.",
  alternates: { canonical: "https://mememusic.fun/terms-of-service" },
};

export default function TermsOfServicePage() {
  return (
    <StaticPage title="Terms of Service" updated={LAST_UPDATED}>
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using MemeMusic.fun (the &ldquo;Service&rdquo;), you agree to be bound by
        these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, please do not use the
        Service. We may update these Terms from time to time; continued use of the Service after
        changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        MemeMusic.fun is a free, ad-supported meme soundboard and GIF vault. It lets users play,
        download, and (optionally) upload meme sound effects and GIFs. No account or sign-up is
        required to use the core features of the Service. We may add, change, or remove features
        at any time without notice.
      </p>

      <h2>3. User Content &amp; Submissions</h2>
      <p>
        If you upload a sound or GIF, you confirm that you either own the rights to that content
        or that it is cleared for reuse (for example, CC0 or otherwise royalty-free), and that
        uploading it does not infringe any third party&rsquo;s rights. By submitting content, you
        grant MemeMusic a non-exclusive, worldwide, royalty-free license to host, display,
        stream, and make that content available for playback and download through the Service.
      </p>
      <p>
        You retain ownership of content you submit. We reserve the right, but not the obligation,
        to review, remove, or refuse any submitted content at our discretion — including content
        that is unlawful, infringing, sexually explicit, defamatory, or otherwise inappropriate —
        without prior notice. If you believe content on the Service infringes your rights, please
        see our <Link href="/contact">Contact page</Link> for how to submit a takedown request.
      </p>

      <h2>4. Prohibited Use</h2>
      <ul>
        <li>Uploading content you don&rsquo;t have the rights to distribute.</li>
        <li>Uploading unlawful, hateful, sexually explicit, or otherwise abusive content.</li>
        <li>Attempting to disrupt, overload, or scrape the Service in an automated or abusive manner.</li>
        <li>Using the Service for any purpose that violates applicable law.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>
        The MemeMusic name, logo, and site design belong to MemeMusic. Meme sounds and GIFs hosted
        on the Service are curated from user submissions and public sources and remain the
        property of their respective original creators or rights holders; MemeMusic does not
        claim ownership over user-submitted meme content beyond the license described in Section 3.
      </p>

      <h2>6. Advertising</h2>
      <p>
        The Service displays advertising, including ads served by Google AdSense and potentially
        other ad networks, to support free access to the Service. See our{" "}
        <Link href="/privacy-policy">Privacy Policy</Link> for details on how advertising cookies
        and personalization work.
      </p>

      <h2>7. Disclaimer of Warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind, whether express or implied, including but not limited to implied
        warranties of merchantability, fitness for a particular purpose, or non-infringement. We
        do not warrant that the Service will be uninterrupted, error-free, or free of harmful
        components.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, MemeMusic and its operators shall not be liable
        for any indirect, incidental, special, consequential, or punitive damages, or any loss of
        data, revenue, or goodwill, arising out of or related to your use of (or inability to use)
        the Service, even if advised of the possibility of such damages.
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify and hold MemeMusic harmless from any claims, damages, or expenses
        (including reasonable legal fees) arising from your use of the Service or your violation
        of these Terms.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which MemeMusic&rsquo;s
        operator resides, without regard to conflict-of-law principles, unless otherwise required
        by applicable local law.
      </p>

      <h2>11. Changes to These Terms</h2>
      <p>
        We may revise these Terms at any time. We&rsquo;ll update the &ldquo;Last updated&rdquo;
        date above when we do. Material changes will be reflected on this page — please check
        back periodically.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
        or visit our <Link href="/contact">Contact page</Link>.
      </p>
    </StaticPage>
  );
}
