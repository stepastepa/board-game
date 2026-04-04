const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));
app.use(express.json()); // Для обработки JSON-запросов

const rooms = new Map(); // для комнат

///////////////////////////////////////////////////////////////////
/////////////////    Timers for Rooms     /////////////////////////

const timers = {}; // таймеры для удаления комнат

function startTimer(key) {
  timers[key] = setTimeout(() => {
    rooms.delete(key);
    console.log(`${key} deleted`);
  }, 10000); // ---> 10sec
  console.log(`Timer "${key}" activated`);
}

function cancelTimer(key) {
  if (timers[key]) {
    clearTimeout(timers[key]);
    console.log(`Timer "${key}" canceled`);
    delete timers[key];
  }
}
///////////////////////////////////

function generateRoomId() {
  return 'room-' + Math.random().toString(36).substr(2, 5);
}

function randomInteger(min, max) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // свап элементов
  }
  return array;
}

function ludoShuffleCW(array) {
  let startIndex = randomInteger(0, array.length - 1);
  let randomCWOrder = [];
  // Добавляем элементы в новый массив, начиная с выбранного индекса по кругу
  for (let i = 0; i < array.length; i++) {
    let currentIndex = (startIndex + i) % array.length;
    randomCWOrder.push(array[currentIndex]);
  }
  
  return randomCWOrder;
}

function generateRandomOrder(board) {
  let randomOrder = [0, 1, 2, 3, 4, 5]; // сброc - blue-0, red-1, green-2, yellow-3, purple-4, black-5

  if (+board === 2) { // для Ludo 4x
    randomOrder = [0, 2, 1, 3]; // CW: blue, green, red, yellow
    return ludoShuffleCW(randomOrder);
  } else if (+board === 3) { // для Ludo 6x
    randomOrder = [0, 1, 4, 2, 3, 5]; // CW: blue, red, purple, green, yellow, black
    return ludoShuffleCW(randomOrder);
  } else if (+board === 6) { // для Sorry
    randomOrder = [1, 0, 3, 2]; // CW: red, blue, yellow, green
    return ludoShuffleCW(randomOrder);
  }

  return shuffle(randomOrder); // перемешивание полное
}

// Генерация начального состояния фишек
function initializePieces(num, board) {
  const pieces = new Map();
  const randomOrder = generateRandomOrder(board); // перемешиваем порядок для фишек

  if (+board === 2) { // расставляем фишки для Ludo 4x
    for (let i = 0; i < +num; i++) {
      for (let y = 1; y <= 4; y++) {
        let blues = [15, 25, 15, 25];
        let greens = [75, 85, 15, 25];
        let yellows = [15, 25, 75, 85];
        let reds = [75, 85, 75, 85];
        let xMin, xMax, yMin, yMax;

        if (randomOrder[i] === 0) [xMin, xMax, yMin, yMax] = blues;
        else if (randomOrder[i] === 1) [xMin, xMax, yMin, yMax] = reds;
        else if (randomOrder[i] === 2) [xMin, xMax, yMin, yMax] = greens;
        else if (randomOrder[i] === 3) [xMin, xMax, yMin, yMax] = yellows;

        pieces.set(`piece-${i}-${y}`, {
          x: randomInteger(xMin, xMax),
          y: randomInteger(yMin, yMax)
        });
      }
    }
  } else if (+board === 3) { // расставляем фишки для Ludo 6x
    for (let i = 0; i < +num; i++) {
      for (let y = 1; y <= 4; y++) {
        let blues = [22, 32, 4, 14];
        let greens = [67, 77, 85, 95];
        let yellows = [22, 32, 85, 95];
        let reds = [67, 77, 4, 14];
        let purples = [85, 95, 45, 55];
        let blacks = [4, 14, 45, 55];
        let xMin, xMax, yMin, yMax;

        if (randomOrder[i] === 0) [xMin, xMax, yMin, yMax] = blues;
        else if (randomOrder[i] === 1) [xMin, xMax, yMin, yMax] = reds;
        else if (randomOrder[i] === 2) [xMin, xMax, yMin, yMax] = greens;
        else if (randomOrder[i] === 3) [xMin, xMax, yMin, yMax] = yellows;
        else if (randomOrder[i] === 4) [xMin, xMax, yMin, yMax] = purples;
        else if (randomOrder[i] === 5) [xMin, xMax, yMin, yMax] = blacks;

        pieces.set(`piece-${i}-${y}`, {
          x: randomInteger(xMin, xMax),
          y: randomInteger(yMin, yMax)
        });
      }
    }
  } else if (+board === 6) { // расставляем фишки для Sorry
    for (let i = 0; i < +num; i++) {
      for (let y = 1; y <= 4; y++) {
        let reds = [27, 33, 13, 20];
        let blues = [80, 86, 27, 34];
        let greens = [14, 20, 66, 73];
        let yellows = [66, 72, 79, 86];
        let xMin, xMax, yMin, yMax;

        if (randomOrder[i] === 0) [xMin, xMax, yMin, yMax] = blues;
        else if (randomOrder[i] === 1) [xMin, xMax, yMin, yMax] = reds;
        else if (randomOrder[i] === 2) [xMin, xMax, yMin, yMax] = greens;
        else if (randomOrder[i] === 3) [xMin, xMax, yMin, yMax] = yellows;

        pieces.set(`piece-${i}-${y}`, {
          x: randomInteger(xMin, xMax),
          y: randomInteger(yMin, yMax)
        });
      }
    }
  } else {
    // расставляем фишки случайно
    for (let i = 0; i < +num; i++) {
      pieces.set(`piece-${i}`, {
        x: randomInteger(35, 55), // 35-55% для начальной позиции
        y: randomInteger(35, 55)
      });
    }
  }
  return { pieces, randomOrder };
}

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

// порядок ходов (цветов) для кубика
function nextOrder(room) {
  room.currentDiceOrder = room.randomOrder[room.iOrder];
  room.iOrder++;
  if (room.iOrder > room.numPlayers - 1) room.iOrder = 0;
  return room.currentDiceOrder;
}

// логика для действий с кубиком
function rollTheDices(room, yyy) {
  const diceNumArray = [1, 2, 3, 4, 5, 6];
  room.justCurrentDices = false;

  if (yyy === 'start') {
    if (+room.boardType === 2 || +room.boardType === 3) { // for Ludo tripple SIX
      if (room.diceOrder === '') { // initial Ludo roll with empty data
        room.number1 = diceNumArray[randomInteger(0, 5)];
        room.number2 = diceNumArray[randomInteger(0, 5)];
        room.diceOrder = nextOrder(room);
      } else {
        // repeating of 6:
        if (room.number1 === 6 && room.counterSix < 3) {
          room.diceOrder = room.diceOrder;
          room.counterSix++;
        } else if (room.number1 != 6 && room.counterSix === 3) {
          room.diceOrder = nextOrder(room);
          room.counterSix++;
        } else {
          room.counterSix = 1;
          room.diceOrder = nextOrder(room);
        }
        ///////////////////////////////
        room.number1 = diceNumArray[randomInteger(0, 5)];
        room.number2 = diceNumArray[randomInteger(0, 5)];
        ///////////////////////////////
        if (room.number1 === 6 && room.counterSix === 3) {
          room.number1 = "6X";
        }
      }
    } else if (+room.boardType === 6) { // for Sorry Cards

      /////////////////////////////
      /////////////////////////////
      // Sorry Cards Array
      const cardsArray = [
        { number: 1, text: "Either move a pawn from Start or move a pawn 1 space forward." },
        { number: 2, text: "Either move a pawn from Start or move a pawn 2 spaces forward. Drawing a two, even if it does not enable movement, entitles the player to draw again at the end of their turn." },
        { number: 3, text: "Move a pawn 3 spaces forward." },
        { number: 4, text: "Move a pawn 4 spaces backward." },
        { number: 5, text: "Move a pawn 5 spaces forward." },
        { number: 7, text: "Move one pawn 7 spaces forward, or split the 7 spaces between two pawns (such as 4 spaces for one pawn and 3 for another). This makes it possible for two pawns to enter Home on the same turn, for example. The seven cannot be used to move a pawn out of Start, even if the player splits it into 6 and 1 or 5 and 2. The entire 7 spaces must be used or their turn ends. The player cannot move their pawn backwards with a split." },
        { number: 8, text: "Move a pawn 8 spaces forward." },
        { number: 10, text: "Move a pawn 10 spaces forward or one space backward. If none of a player's pawns can move forward 10 spaces, then one pawn must move back 1 space." },
        { number: 11, text: "Move 11 spaces forward, or switch the places of one of the player's own pawns and an opponent's pawn. A player who cannot move 11 spaces is not forced to switch and instead can end their turn. An 11 cannot be used to switch a pawn that is in a Safety Zone, or to move a pawn out of Start." },
        { number: 12, text: "Move a pawn twelve spaces forward." },
        { number: 'Sorry!', text: "Take any one pawn from Start and move it directly to a square occupied by any opponent's pawn, sending that pawn back to its own Start. A Sorry! card cannot be used on an opponent's pawn in a Safety Zone or at the Home base. If there are no pawns on the player's Start, or no opponent's pawns on any space that can be moved to, the turn ends." },
      ];

      let pickedCard = cardsArray[randomInteger(0, 10)]; // pick a random card
      room.number1 = pickedCard.number;
      room.number2 = pickedCard.text;
      room.diceOrder = nextOrder(room);

      /////////////////////////////
      /////////////////////////////

    } else { // for others games
      room.number1 = diceNumArray[randomInteger(0, 5)];
      room.number2 = diceNumArray[randomInteger(0, 5)];
      room.diceOrder = nextOrder(room);
    }
  } else if (yyy === 'reset') {
    room.number1 = 0;
    room.number2 = 0;
    room.diceOrder = 0;
  } else if (yyy === 'current') {
    room.number1 = room.number1;
    room.number2 = room.number2;
    room.diceOrder = room.diceOrder;
    room.justCurrentDices = true; // to detect reloading the page
  }
}

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

function sendNumberOfOnlinePlayers(room) {
  // Рассылаем количество игроков онлайн
  room.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'online players',
        playersOnline: room.clients.size
      }));
    }
  });
}

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/start', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'start.html')); // стартовая страница
});

app.post('/create-room', (req, res) => { // POST запрос
  // генерируем случайный номер для комнаты
  const roomId = generateRoomId();

  // инициализируем поле при первом запуске
  const howManyPlayers = 6; // 6шт игроков
  const whatBoard = 1; // поле номер 1
  const { pieces, randomOrder } = initializePieces(howManyPlayers, whatBoard);

  // начальные данные для комнаты
  rooms.set(roomId, {
    pieces,
    randomOrder,
    numPlayers: howManyPlayers,
    boardType: whatBoard,
    number1: '',
    number2: '',
    diceOrder: '',
    currentDiceOrder: '',
    iOrder: 0,
    counterSix: 1,
    justCurrentDices: '',
    clients: new Set()
  });

  // перенаправляет на страницу комнаты
  // res.redirect(`/${roomId}`);
  
  // отдает JSON c номером комнаты на стартовую страницу
  // res.json({ roomId });

  // Проверяем query-параметр autojoin
  if (req.body.autojoin === 'true') { // req.body (POST) или req.query (GET+POST)!!!
    res.redirect(`/${roomId}`);
  } else {
    res.json({ roomId });
  }
});

// заходим на страницу комнаты по ее адресу
app.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  if (!rooms.has(roomId)) {
    // return res.status(404).send('Room not found or it was deleted :(');
    // ---> 404 (при написании неверной комнаты)
    return res.status(404).sendFile(path.join(__dirname, 'public', 'page404.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'game.html')); // страница с игрой
});

///////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////

wss.on('connection', (ws, req) => {
  const roomId = req.url.slice(1);
  console.log(req.url);
  if (!rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
    ws.close();
    return;
  }

  const room = rooms.get(roomId);
  room.clients.add(ws);

  console.log(`New player connected to ${roomId}`);
  cancelTimer(roomId); // отменяем таймер удаления комнаты

  sendNumberOfOnlinePlayers(room); // Рассылаем количество игроков онлайн

  // Отправляем полное текущее состояние всех фишек новому игроку
  ws.send(JSON.stringify({
    type: 'init',
    pieces: Object.fromEntries(room.pieces),
    numPlayers: room.numPlayers,
    boardType: room.boardType,
    number1: room.number1,
    number2: room.number2,
    diceOrder: room.diceOrder,
    randomOrder: room.randomOrder,
    iOrder: room.iOrder,
    roomId,
    playersOnline: room.clients.size
  }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'move') {
      room.pieces.set(data.id, {
        x: data.x,
        y: data.y
      });

      // Рассылаем обновление всем подключенным клиентам
      room.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'update',
            id: data.id,
            x: data.x,
            y: data.y,
            timestamp: data.timestamp // timestamp *******
          }));
        }
      });
    } else if (data.type === 'settings') {
      // Обновляем настройки
      room.numPlayers = data.numPlayers;
      room.boardType = data.boardType;
      const { pieces, randomOrder } = initializePieces(room.numPlayers, room.boardType);
      room.pieces = pieces;
      room.randomOrder = randomOrder;
      room.iOrder = 0; // скидываем index для randomOrder[i] кубиков!!!

      // Рассылаем новые настройки всем клиентам
      room.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'settings',
            pieces: Object.fromEntries(room.pieces),
            numPlayers: room.numPlayers,
            boardType: room.boardType,
            randomOrder: room.randomOrder
          }));
        }
      });
    } else if (data.type === 'dices') {
      if (data.rolling === 'start rolling') {
        rollTheDices(room, 'start');
      } else if (data.rolling === 'reset dices') {
        rollTheDices(room, 'reset');
      } else if (data.rolling === 'current dices') {
        rollTheDices(room, 'current');
      }

      // Рассылаем новые кубики всем клиентам
      room.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'dices',
            number1: room.number1,
            number2: room.number2,
            diceOrder: room.diceOrder,
            justCurrentDices: room.justCurrentDices
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    console.log(`Player disconnected from ${roomId}`);
    if (room.clients.size === 0) {
      // rooms.delete(roomId);
      // console.log(`Room ${roomId} deleted`);
      // console.log(room);
      startTimer(roomId);
    }
    
    sendNumberOfOnlinePlayers(room); // Рассылаем количество игроков онлайн
  });
});


const PORT = 80;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
