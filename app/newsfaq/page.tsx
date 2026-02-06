import Link from 'next/link';

export default function FaqPage() {
  return (
    <div className="static-page">
      <h2>Hacker News FAQ</h2>

      <p><b>Are there rules about submissions and comments?</b></p>
      <p>
        <Link href="/newsguidelines">https://news.ycombinator.com/newsguidelines.html</Link>
      </p>

      <p><b>How is a user&apos;s karma calculated?</b></p>
      <p>
        Roughly, the number of upvotes on their posts minus the number of downvotes.
        These don&apos;t match up exactly because some votes are dropped to prevent abuse.
      </p>

      <p><b>Do posts by new accounts get penalized?</b></p>
      <p>
        Not directly, but some users look at who submitted a story and penalize submissions
        from new accounts by not upvoting them.
      </p>

      <p><b>Why don&apos;t I see down arrows?</b></p>
      <p>
        There are no down arrows on stories. Comment downvoting is available to users with
        500+ karma.
      </p>

      <p><b>What does &quot;[dead]&quot; mean?</b></p>
      <p>
        A dead post or comment is one that has been killed by the software, user flags,
        or moderator action. Dead items are invisible to most users unless they have
        &quot;showdead&quot; enabled in their profile settings.
      </p>

      <p><b>How do I submit a question?</b></p>
      <p>
        Use the <Link href="/submit">submit</Link> page. Leave the url field blank and put
        your question in the title, preceded by &quot;Ask HN:&quot;.
      </p>

      <p><b>How do I submit a &quot;Show HN&quot;?</b></p>
      <p>
        If you want to show the community something you&apos;ve made, prefix the title with
        &quot;Show HN:&quot;.
      </p>

      <p><b>What does &quot;vouch&quot; mean?</b></p>
      <p>
        Vouching is a way for users with sufficient karma to undo flags on items that were
        flagged unfairly. If you see a dead item and believe it shouldn&apos;t be dead, you can
        vouch for it. If enough users vouch, the item may be restored.
      </p>

      <p><b>What&apos;s the noprocrast feature?</b></p>
      <p>
        It&apos;s a self-control feature. If you turn it on in your profile, you&apos;ll only be
        able to visit the site for maxvisit minutes at a time, with a gap of minaway
        minutes in between.
      </p>
    </div>
  );
}
