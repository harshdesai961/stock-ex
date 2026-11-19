import {
  asteriskCensorStrategy,
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
  TextCensor,
} from 'obscenity';

// A basic profanity filter for table chat (spec 6). English only for now, and it catches
// common disguises ("sh1t") without flagging innocent words ("Scunthorpe", "assassin").
// Reports and mutes handle whatever gets through.

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});
const censor = new TextCensor().setStrategy(asteriskCensorStrategy());

/** The message with any matched words replaced by asterisks. */
export function censorChat(text: string): string {
  const matches = matcher.getAllMatches(text, true);
  return matches.length === 0 ? text : censor.applyTo(text, matches);
}
