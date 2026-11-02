import { COMPANIES } from '@stock-ex/engine';
import { formatRupees, formatSignedRupees } from '@stock-ex/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'How to Play · stock-ex',
  description:
    'The complete stock-ex manual in plain language: rooms, cards, trading, windfalls, Chairmen, Directors and winning, with worked examples.',
};

const CONTENTS = [
  { id: 'big-idea', label: 'The big idea' },
  { id: 'rooms', label: 'Starting or joining a room' },
  { id: 'companies', label: 'Companies and cards' },
  { id: 'period', label: 'How a Bargain Period runs' },
  { id: 'turn', label: 'What you can do on your turn' },
  { id: 'windfalls', label: 'Windfall cards' },
  { id: 'reveal', label: 'The reveal, step by step' },
  { id: 'bosses', label: 'Chairmen and Directors' },
  { id: 'currency', label: 'Currency cards' },
  { id: 'insolvency', label: 'Insolvency' },
  { id: 'winning', label: 'Winning' },
  { id: 'tips', label: 'Tips for your first games' },
  { id: 'glossary', label: 'Quick glossary' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12">
      <h2 className="text-2xl font-bold text-ink-100">{title}</h2>
      <div className="mt-3 space-y-3 text-ink-300">{children}</div>
    </section>
  );
}

function Example({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-ink-700 bg-ink-900 p-4">
      <h3 className="font-semibold text-accent-400">Example: {title}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Windfall({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-windfall-500 bg-ink-900 p-4">
      <h3 className="font-semibold text-windfall-400">★ {name}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-ink-100">{children}</strong>
);

const EXAMPLE_CARDS = [15, 10, 5, -10, -10, -5];

export default function HowToPlayPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm font-semibold tracking-wide text-accent-400 uppercase">The manual</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">How to Play</h1>
        <p className="mt-3 text-lg text-ink-300">
          Everything you need, in plain language. New here? Read the first four sections and start
          playing. Come back for the rest when a card surprises you.
        </p>

        <nav
          aria-label="Manual contents"
          className="mt-6 rounded-card border border-ink-700 bg-ink-900 p-4"
        >
          <h2 className="font-semibold">Contents</h2>
          <ol className="mt-2 grid list-inside list-decimal gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {CONTENTS.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="underline hover:text-accent-400">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Section id="big-idea" title="The big idea">
          <p>
            You’re a trader with {formatRupees(600_000)} of play money and six companies to invest
            in. Before anyone trades, each player is secretly dealt cards that hint at where prices
            are heading. You trade on what you know and what you can guess from others. Then all the
            cards are turned over, and the prices move.
          </p>
          <p>
            There are no dice.{' '}
            <Strong>The winner is whoever has the most cash plus share value</Strong> after the
            agreed number of rounds, which are called <Strong>Bargain Periods</Strong>.
          </p>
          <p>
            In-game rupees are play money only. They can never be bought, cashed out or swapped for
            anything of value, and the companies are all made up.
          </p>
        </Section>

        <Section id="rooms" title="Starting or joining a room">
          <p className="rounded-lg border border-accent-400 bg-ink-900 p-3 text-sm text-ink-100">
            Live rooms are being built and open soon. This is how they will work.
          </p>
          <p>
            <Strong>To host:</Strong> choose a nickname (up to 10 characters, or roll the 🎲) and
            create a private game. You get a 5-character room code and an invite link to share. In
            the lobby you can add or remove bots, kick players, and change the settings: number of
            Bargain Periods (1 to 20, default 5), starting cash (₹6 lakh to ₹10 lakh), turn timer
            and maximum players. When everyone’s ready, press <Strong>Open the Market</Strong>.
          </p>
          <p>
            <Strong>To join:</Strong> choose a nickname that nobody else at that table is using,
            then enter the room code or open the invite link. You can take a seat, or choose to
            watch: up to 10 spectators can follow a table, and they only ever see public
            information.
          </p>
          <p>
            <Strong>Lost connection?</Strong> Refresh within about a minute and your seat is
            waiting. After that a bot looks after your seat, marked AFK, until you press{' '}
            <Strong>Take back control</Strong>.
          </p>
        </Section>

        <Section id="companies" title="Companies and cards">
          <p>
            Each company has 2,00,000 shares. The bank holds whatever players don’t own. Bigger
            companies swing harder:
          </p>
          <div className="overflow-x-auto rounded-card border border-ink-700" tabIndex={0}>
            <table className="w-full text-left text-sm">
              <caption className="sr-only">The six companies and their price cards</caption>
              <thead className="bg-ink-800 text-ink-100">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Opens at
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Price cards
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPANIES.map((company) => (
                  <tr key={company.id} className="border-t border-ink-700">
                    <th scope="row" className="px-3 py-2 font-medium text-ink-100">
                      {company.name}
                    </th>
                    <td className="px-3 py-2 font-mono">{formatRupees(company.openingPrice)}</td>
                    <td className="px-3 py-2 font-mono">
                      ±5 to ±{Math.max(...company.cardValues)}, in steps of 5
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>The deck has 108 cards:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <Strong>92 price cards.</Strong> Every value in the table exists twice. Kuber Bank,
              for example, has two each of +15, +10, +5, −5, −10 and −15.
            </li>
            <li>
              <Strong>8 currency cards.</Strong> Four +10% and four −10%. They change everyone’s
              cash (see{' '}
              <a href="#currency" className="underline">
                Currency cards
              </a>
              ).
            </li>
            <li>
              <Strong>8 windfall cards.</Strong> Two each of four special cards (see{' '}
              <a href="#windfalls" className="underline">
                Windfall cards
              </a>
              ).
            </li>
          </ul>
          <p>
            Here’s the secret that makes the game:{' '}
            <Strong>each company’s cards add up to zero</Strong>. If you hold a lot of plus cards
            for a company, the rest of its deck leans negative.
          </p>
        </Section>

        <Section id="period" title="How a Bargain Period runs">
          <ol className="list-inside list-decimal space-y-1">
            <li>
              The deck is shuffled and every player gets 10 private cards. The rest aren’t used this
              period.
            </li>
            <li>
              Starting with the period’s first player, everyone takes one turn, going clockwise.
              There are 3 rounds of this, so with 4 players that’s 12 turns.
            </li>
            <li>
              Every trade is announced on the Market Tape: who, what, how many and at what price.
              Nobody sees your cards.
            </li>
            <li>
              <Strong>Prices don’t change during trading.</Strong> They only move at the reveal.
            </li>
            <li>
              After the last turn comes the reveal, and then the next period with all-new cards.
            </li>
          </ol>
          <p>
            The first player of the game is drawn at random, then the role moves one seat clockwise
            each period. Going last is an advantage, because you’ve seen what everyone else did.
          </p>
        </Section>

        <Section id="turn" title="What you can do on your turn">
          <p>You get exactly one of these each turn. Shares always trade in multiples of 1,000.</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <Strong>Buy</Strong> shares in one company, if you have the cash and the bank has the
              shares.
            </li>
            <li>
              <Strong>Sell</Strong> shares you own in one company. You can’t sell what you don’t
              have.
            </li>
            <li>
              <Strong>Play a windfall card</Strong> from your hand, if it’s allowed right now.
            </li>
            <li>
              <Strong>Pass.</Strong> If your timer runs out, this happens automatically.
            </li>
          </ul>
          <Example title="buying and selling">
            <p>
              Kuber Bank costs ₹25 and your cards look good. You buy 5,000 shares: 5,000 × ₹25 ={' '}
              {formatRupees(125_000)}. Your cash goes from {formatRupees(600_000)} to{' '}
              {formatRupees(475_000)}, and the tape shows the trade to everyone.
            </p>
            <p>
              Next period Kuber Bank is at ₹30. You sell all 5,000: 5,000 × ₹30 ={' '}
              {formatRupees(150_000)}. That’s {formatRupees(25_000)} profit.
            </p>
          </Example>
        </Section>

        <Section id="windfalls" title="Windfall cards">
          <p>
            These are the purple cards. They only work in the period you’re dealt them, and unused
            ones are thrown away at the end of the period. The first three use up a turn.
          </p>
          <Windfall name="Loan Stock Matured">
            <p>Collect {formatRupees(100_000)} from the bank. Simple and always good.</p>
          </Windfall>
          <Windfall name="Debenture">
            <p>
              Only playable if you own shares in a company that is currently insolvent (priced at
              ₹0). You sell all your shares in that one company back to the bank at its{' '}
              <Strong>opening game price</Strong>.
            </p>
            <p>
              <Strong>Example:</Strong> you hold 10,000 Sanjeevani Pharma, and it has crashed to ₹0.
              Those shares are worth nothing, but a Debenture pays 10,000 × ₹20 ={' '}
              {formatRupees(200_000)}.
            </p>
          </Windfall>
          <Windfall name="Rights Issue">
            <p>
              Pick a solvent company you own at least 1,000 shares of. Every holder of that company
              may buy 1 extra share for every 2 they hold, at a fixed <Strong>₹10 per share</Strong>
              , whatever the market price is. It rounds down to a whole 1,000.
            </p>
            <p>
              You choose first, then each other holder gets a timed offer going clockwise. If they
              do nothing, they’ve declined. If the bank runs short, you get priority, then the
              others in clockwise order.
            </p>
            <p>
              <Strong>Example:</Strong> you hold 13,000 Agni Energy, priced at ₹55. Half is 6,500,
              which rounds down to 6,000. You can buy those for 6,000 × ₹10 = {formatRupees(60_000)}
              , shares that are worth {formatRupees(330_000)} on the market.
            </p>
            <p>The catch: a rival who holds the same company gets the same bargain.</p>
          </Windfall>
          <Windfall name="Share Suspended">
            <p>
              This one isn’t a turn. It’s used during the reveal, once all the cards are showing, to{' '}
              <Strong>freeze one company’s price</Strong> for this period. Use it to dodge a crash
              in a company you hold, or to stop a rival’s big gain.
            </p>
          </Windfall>
        </Section>

        <Section id="reveal" title="The reveal, step by step">
          <p>When trading ends, these happen in this exact order:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>All hands are turned face up.</li>
            <li>Chairmen and Directors may each cancel a card (at most one per company).</li>
            <li>Each company’s remaining price cards are added up.</li>
            <li>Share Suspended holders may freeze a company, clockwise from the first player.</li>
            <li>Prices move. A price can never go below ₹0.</li>
            <li>
              Currency cards are counted, and everyone’s cash changes if they don’t cancel out.
            </li>
            <li>Companies at ₹0 become insolvent, and any that have recovered return.</li>
            <li>All cards are thrown away. Nothing carries over.</li>
          </ol>
          <Example title="adding up a company">
            <p>The revealed Kuber Bank cards, across all hands, are:</p>
            <p className="font-mono text-ink-100">
              {EXAMPLE_CARDS.map((card) => formatSignedRupees(card)).join('  ')}
            </p>
            <p>
              The plus cards make +30 and the minus cards make −25, so the movement is{' '}
              <Strong>+5</Strong>. Kuber Bank goes from ₹25 to ₹30.
            </p>
          </Example>
        </Section>

        <Section id="bosses" title="Chairmen and Directors">
          <p>
            Own enough of a company and you get a say in its fate. Status is checked at the end of
            each period, using what you hold at that moment. You can hold these roles in several
            companies at once.
          </p>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <Strong>Chairman: 1,00,000 shares or more.</Strong> Only one per company. You may
              cancel the single most negative card of that company from <Strong>anyone’s</Strong>{' '}
              hand. If two players tie, whoever reached 1,00,000 first is Chairman. If there are no
              negative cards for that company, there’s nothing for you to cancel.
            </li>
            <li>
              <Strong>Director: 50,000 shares or more, without being Chairman.</Strong> The biggest
              holder gets the role, and ties go to whoever reached that holding first. You may
              cancel one card of that company from <Strong>your own</Strong> hand.
            </li>
          </ul>
          <p>
            Only one card per company can be cancelled per period. The Chairman decides first. The
            Director gets a chance only if there’s no Chairman, or the Chairman declines. If time
            runs out, the most negative available card is cancelled automatically.
          </p>
          <Example title="a Chairman saves the day">
            <p>
              You own 1,20,000 Vajra Motors at ₹40. The revealed cards are +15, +10, −15, −10 and
              −5, which would total −5. As Chairman you cancel the −15, so the total becomes{' '}
              <Strong>+10</Strong> and the price rises to ₹50. On your holding, that’s a swing from
              a {formatRupees(600_000)} loss to a {formatRupees(1_200_000)} gain.
            </p>
          </Example>
        </Section>

        <Section id="currency" title="Currency cards">
          <p>
            Count the +10% and −10% cards across all hands. Only the overall direction matters. If
            there are more +10% cards, <Strong>every player gains 10% of their cash in hand</Strong>
            . If there are more −10% cards, every player loses 10%. If they’re equal, nothing
            happens. Each amount is rounded to the nearest ₹5,000.
          </p>
          <Example title="a currency rise">
            <p>
              Three +10% cards and two −10% cards are showing, so the direction is up. You have{' '}
              {formatRupees(610_000)} in cash. 10% is {formatRupees(61_000)}, which rounds to{' '}
              {formatRupees(60_000)}, so you end up with {formatRupees(670_000)}.
            </p>
            <p>
              Shares aren’t affected, so holding cash before a rise pays off, and holding shares
              protects you from a fall.
            </p>
          </Example>
        </Section>

        <Section id="insolvency" title="Insolvency">
          <p>
            If a company’s price reaches ₹0, it’s <Strong>insolvent</Strong> for the next period:
            nobody can buy, sell or use a Rights Issue on it. Holders keep their shares, now worth
            nothing, unless they have a Debenture.
          </p>
          <p>
            It isn’t necessarily the end. The company’s cards are still dealt, and a positive total
            at the next reveal brings it back.
          </p>
          <Example title="crash and recovery">
            <p>
              Sanjeevani Pharma is at ₹20 and its cards total −25. The price stops at ₹0, not −₹5,
              and it’s insolvent next period. At the following reveal its cards total +5, so it’s
              back at ₹5 and trading again.
            </p>
          </Example>
        </Section>

        <Section id="winning" title="Winning">
          <p>
            After the last Bargain Period, your net worth is your cash plus every share you hold at
            final prices. The highest wins. Ties go to whoever has more cash, and if that’s equal
            too, you share the placing.
          </p>
          <Example title="final score">
            <p>
              You have {formatRupees(300_000)} in cash and 10,000 Vidya Infotech at a final price of
              ₹50, worth {formatRupees(500_000)}. Your net worth is {formatRupees(800_000)}.
            </p>
          </Example>
          <p>
            When it’s over, the game’s shuffle seed is shown, so players can check that the deal was
            fair.
          </p>
        </Section>

        <Section id="tips" title="Tips for your first games">
          <ul className="list-inside list-disc space-y-2">
            <li>
              <Strong>Add up your hand per company.</Strong> The game shows this as your signal.
              It’s your best starting clue.
            </li>
            <li>
              <Strong>Watch the tape.</Strong> Someone buying heavily probably holds good cards for
              that company.
            </li>
            <li>
              <Strong>Don’t forget your windfalls.</Strong> They vanish at the end of the period,
              and {formatRupees(100_000)} of free money is a good turn.
            </li>
            <li>
              <Strong>Think about percentages.</Strong> A +5 on a ₹20 company is a 25% gain. On an
              ₹80 company it’s about 6%.
            </li>
            <li>
              <Strong>Aim for Director or Chairman</Strong> in a company you believe in. Controlling
              a card can swing a lot of money.
            </li>
            <li>
              <Strong>In the last period, value everything at final prices.</Strong> Only hold
              shares you expect to rise, and remember a −10% currency card can still hit your cash.
            </li>
          </ul>
        </Section>

        <Section id="glossary" title="Quick glossary">
          <dl className="space-y-2">
            {[
              ['Bargain Period', 'One full cycle: deal, 3 rounds of turns, reveal.'],
              ['Market Tape', 'The public feed of every trade and event.'],
              ['Signal', 'The total of your own cards for a company.'],
              ['Movement', 'The total of all remaining cards for a company at the reveal.'],
              ['Net worth', 'Your cash plus your shares at current prices.'],
              ['Insolvent', 'A company priced at ₹0. It can’t be traded until it recovers.'],
              ['Bull / Bear', 'Bull expects prices to rise. Bear expects them to fall.'],
              ['Lot', 'A block of 1,000 shares, the smallest amount you can trade.'],
            ].map(([term, meaning]) => (
              <div key={term}>
                <dt className="font-semibold text-ink-100">{term}</dt>
                <dd>{meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div className="mt-12 rounded-card border border-ink-700 bg-ink-800 p-6 text-center">
          <h2 className="text-xl font-bold">Ready to try it?</h2>
          <p className="mt-1 text-ink-300">Play a quick practice round, no sign-up needed.</p>
          <Link
            href="/#practice"
            className="mt-4 inline-block rounded-lg bg-accent-400 px-6 py-3 font-bold text-ink-950 hover:bg-windfall-400"
          >
            Call the Market
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
