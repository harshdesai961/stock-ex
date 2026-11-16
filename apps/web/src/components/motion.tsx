/** Splits a heading into words that slide up one after another. Screen readers read it normally. */
export function SlideText({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className="slide-word">
            <span>{word}</span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}
