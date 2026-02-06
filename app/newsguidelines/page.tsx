export default function GuidelinesPage() {
  return (
    <div className="static-page">
      <h2>Hacker News Guidelines</h2>

      <p><b>What to Submit</b></p>
      <p>
        On-Topic: Anything that good hackers would find interesting. That includes more than hacking
        and startups. If you had to reduce it to a sentence, the answer might be: anything that
        gratifies one&apos;s intellectual curiosity.
      </p>
      <p>
        Off-Topic: Most stories about politics, or crime, or sports, unless they&apos;re evidence of
        some interesting new phenomenon. Videos of pratfalls or disasters, or cute animal pictures.
        If they&apos;d cover it on TV news, it&apos;s probably off-topic.
      </p>

      <p><b>In Submissions</b></p>
      <ul>
        <li>Please don&apos;t do things to make titles stand out, like using uppercase or exclamation points,
          or saying &quot;this&quot; or adding a parenthetical remark. It&apos;s implicit in every link that we
          think it is interesting.</li>
        <li>Please don&apos;t submit paywalled articles. If a site has a paywall but also allows free access,
          it&apos;s ok to submit.</li>
        <li>If the title of the article is misleading or linkbait, please change it to accurately describe
          the content.</li>
        <li>Please submit the original source. If a post reports on something found on another site, submit
          the latter.</li>
        <li>If the title includes the name of the site, please take it out, because the site name will be
          displayed after the link.</li>
      </ul>

      <p><b>In Comments</b></p>
      <ul>
        <li>Be civil. Don&apos;t say things you wouldn&apos;t say face-to-face. Don&apos;t be snarky. Comments should
          get more civil and substantive, not less, as a topic gets more divisive.</li>
        <li>When disagreeing, please reply to the argument instead of calling names. &quot;That is idiotic;
          1+1 is 2, not 3&quot; can be shortened to &quot;1+1 is 2, not 3.&quot;</li>
        <li>Please don&apos;t fulminate. Please don&apos;t sneer, including at the rest of the community.</li>
        <li>Please respond to the strongest plausible interpretation of what someone says, not a weaker
          one that&apos;s easier to criticize. Assume good faith.</li>
        <li>Eschew flamebait. Avoid unrelated controversies and generic tangents.</li>
        <li>Please don&apos;t post shallow dismissals, especially of other people&apos;s work. A good critical
          comment teaches us something.</li>
        <li>Please don&apos;t use Hacker News for political or ideological battle. It tramples curiosity.</li>
      </ul>
    </div>
  );
}
