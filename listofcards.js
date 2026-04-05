const cardsArray = [
  { number: 1, quantity: 5, text: "Either move a pawn from Start or move a pawn 1 space forward." },
  { number: 2, quantity: 4, text: "Either move a pawn from Start or move a pawn 2 spaces forward. Drawing a two, even if it does not enable movement, entitles the player to draw again at the end of their turn." },
  { number: 3, quantity: 4, text: "Move a pawn 3 spaces forward." },
  { number: 4, quantity: 4, text: "Move a pawn 4 spaces backward." },
  { number: 5, quantity: 4, text: "Move a pawn 5 spaces forward." },
  { number: 7, quantity: 4, text: "Move one pawn 7 spaces forward, or split the 7 spaces between two pawns (such as 4 spaces for one pawn and 3 for another). This makes it possible for two pawns to enter Home on the same turn, for example. The seven cannot be used to move a pawn out of Start, even if the player splits it into 6 and 1 or 5 and 2. The entire 7 spaces must be used or their turn ends. The player cannot move their pawn backwards with a split." },
  { number: 8, quantity: 4, text: "Move a pawn 8 spaces forward." },
  { number: 10, quantity: 4, text: "Move a pawn 10 spaces forward or one space backward. If none of a player's pawns can move forward 10 spaces, then one pawn must move back 1 space." },
  { number: 11, quantity: 4, text: "Move 11 spaces forward, or switch the places of one of the player's own pawns and an opponent's pawn. A player who cannot move 11 spaces is not forced to switch and instead can end their turn. An 11 cannot be used to switch a pawn that is in a Safety Zone, or to move a pawn out of Start." },
  { number: 12, quantity: 4, text: "Move a pawn twelve spaces forward." },
  { number: 'Sorry!', quantity: 4, text: "Take any one pawn from Start and move it directly to a square occupied by any opponent's pawn, sending that pawn back to its own Start. A Sorry! card cannot be used on an opponent's pawn in a Safety Zone or at the Home base. If there are no pawns on the player's Start, or no opponent's pawns on any space that can be moved to, the turn ends." },
];

module.exports = { cardsArray };