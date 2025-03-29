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

function generateRandomOrder(board) {
  let randomOrder = [0, 1, 2, 3, 4, 5]; // сброc
  // для Ludo
  if (+board === 2) {
    randomOrder = [0, 1, 2, 3];
  }
  return shuffle(randomOrder); // перемешивание
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
    roomId
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
  });
});


const PORT = 80;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
