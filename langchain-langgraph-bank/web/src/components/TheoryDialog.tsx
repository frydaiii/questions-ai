import { useState } from "react";
import { useBank } from "../data/BankProvider";
import { Dialog } from "./Dialog";
import { TheoryCardView } from "./TheoryCardView";
import { BookIcon } from "./Icons";

/** Drawer showing one theory card. Render once per page and drive it with `useTheoryDialog`. */
export function TheoryDialog({ cardId, onClose }: { cardId: string | null; onClose: () => void }) {
  const { bank, domainName } = useBank();
  const card = cardId ? bank.theory[cardId] : undefined;
  return (
    <Dialog
      open={Boolean(card)}
      onClose={onClose}
      title={card?.title ?? ""}
      description="Theory card"
      variant="side"
      size="lg"
    >
      {card && <TheoryCardView card={card} domainName={domainName(card.domain)} />}
    </Dialog>
  );
}

export function useTheoryDialog() {
  const [cardId, setCardId] = useState<string | null>(null);
  return {
    open: setCardId,
    dialog: <TheoryDialog cardId={cardId} onClose={() => setCardId(null)} />,
  };
}

/** Button that opens a theory card, labelled with the card's title. */
export function TheoryButton({ cardId, onOpen }: { cardId: string; onOpen: (id: string) => void }) {
  const { bank } = useBank();
  const card = bank.theory[cardId];
  if (!card) return null;
  return (
    <button type="button" className="theory-btn" onClick={() => onOpen(cardId)}>
      <BookIcon size={16} />
      <span className="theory-btn__text">{card.title}</span>
    </button>
  );
}
