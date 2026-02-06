export default function FormatDocPage() {
  return (
    <div className="static-page">
      <h2>Formatting Options</h2>

      <p><b>Blank lines</b></p>
      <p>
        Blank lines separate paragraphs.
      </p>

      <p><b>Italics</b></p>
      <p>
        Text surrounded by asterisks is italicized. So <code>*foo*</code> becomes <i>foo</i>.
      </p>

      <p><b>Code</b></p>
      <p>
        Text after a blank line that is indented by two or more spaces is reproduced
        verbatim. (This is intended for code.)
      </p>

      <p><b>URLs</b></p>
      <p>
        URLs become links automatically.
      </p>
    </div>
  );
}
