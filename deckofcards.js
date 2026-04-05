function deckOfCards(cardsArray) {
  let deck = [];
  let currentCard = null;

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildDeck() {
    const expanded = cardsArray.flatMap(({ number, text, quantity }) =>
      Array.from({ length: quantity }, () => ({ number, text }))
    );
    return shuffle(expanded);
  }

  // Инициализируем колоду сразу при создании
  deck = buildDeck();

  function pickCard(action) {
    if (action === "next") {
      if (deck.length === 0) {
        console.log("Колода закончилась, пересобираем!");
        deck = buildDeck(); // новую колоду генерируем сразу же!
        currentCard = deck.pop(); // сразу вытаскиваем карту из новой колоды
        return currentCard;
      }
      currentCard = deck.pop();
      return currentCard;

    } else if (action === "current") {
      return currentCard;

    } else if (action === "reset") {
      deck = buildDeck();
      currentCard = null;
      return null;
    }
  }

  return pickCard;
}

module.exports = { deckOfCards };