import "../css/popup.css";
import 'jquery';
import ChessWebAPI from 'chess-web-api';
import Chess from 'chess.js';
import '../../node_modules/@chrisoakman/chessboardjs/dist/chessboard-1.0.0';

const chessAPI = new ChessWebAPI();

// Initialise the game, puzzle and board variables
let game, dailyPuzzle, board; 
// Initialze game variables
let correctMoves, correctFENs, totalMoves, moveCount, moveCountUI;
// Initialize state variables
let playing, hintActive, typeChanged, solutionShown, promoting;
// Initialize promotion variables
let promotionPiece, closePromotionWhite, closePromotionBlack;

// Set variables to default values on load or puzzle change
let resetVariables = () => {
  game = undefined;
  dailyPuzzle = undefined;
  board = null;
  correctMoves = [];
  correctFENs = [];
  totalMoves = 0; 
  moveCount = 0;
  moveCountUI = 1;
  promotionPiece = "";
  puzzleMoves.textContent = "";
  controlPanelRight.classList.add('hide');
  tip.classList.remove("noDisplay");
  puzzleMoves.classList.add("noDisplay");
  playing = false;
  hintActive = false;
  typeChanged = false;
  solutionShown = false;
  promoting = false;
  closePromotionWhite = false;
  closePromotionBlack = false;
}

// Puzzle type
let puzzleType = document.querySelector('.random-slider');
let nextPuzzleBtn = document.querySelector('.next-puzzle-button');
// UI
let promotionWindowWhite = document.querySelector('.promotion-window-white');
let promotionWindowBlack = document.querySelector('.promotion-window-black');
let puzzleTitle = document.querySelector('.title');
let statusBar = document.querySelector('.status-bar');
let playerStatus = document.querySelector('.status');
let tip = document.querySelector('.tip');
let puzzleMoves = document.querySelector('.moves');
let puzzleURL = document.querySelector('.url');
// Control Panel
let controlPanelRight = document.querySelector('.control-panel-right');
let hintIcon = document.querySelector('.hint');
let solutionIcon = document.querySelector('.solution');
let resetIcon = document.querySelector('.reset');
let flipIcon = document.querySelector('.flip');
let playIcon = document.querySelector('.play');
let startIcon = document.querySelector('.start');
let backIcon = document.querySelector('.back');
let forwardIcon = document.querySelector('.forward');
let endIcon = document.querySelector('.end');

// Display puzzle title and link to chess.com
let displayInfo = (puzzle) => {
  puzzleTitle.textContent = puzzle.body.title;
  puzzleURL.href = puzzle.body.url;
};

// Get array of correct moves and corresponding FENs from the puzzle PGN
let getCorrectMoves = (puzzle) => {
  // parse the puzzle's PGN with a regular expression to return everything after the double line break (standard PGN notation)
  correctMoves = (puzzle.body.pgn).match('(?:\\r\\n\\r\\n)(.*)')[1];
  // Match all items that fit the move pattern
  let moveRegex = /([A-z]+[\d][A-z]*[\d]*[+#=]*[BNQR]*[+#]*)/g
  correctMoves = correctMoves.match(moveRegex);
  // Keep track of how many moves are in the puzzle 
  totalMoves = correctMoves.length;
  // Generate a new table to make the moves
  let pos = new Chess(puzzle.body.fen);
  correctMoves.forEach(move => {
    // For each move, get the FEN
    correctFENs.push(getFEN(move, pos));
  });
}

let getFEN = (move, pos) => {
  // Make the move
  pos.move(move);
  // Return the resulting FEN
  return pos.fen();
}

// Update the status bar under the board
let updateStatus = (move) => {
  statusBar.classList.remove('white');
  statusBar.classList.remove('black');

  if (move === "solved") {
    // Check if the puzzle has been solved
    statusBar.classList.add('solved');
    playerStatus.textContent = 'Solved!';
    controlPanelRight.classList.remove('hide');
    return;
  } else if (move === "correct") {
    // If the move was correct 
    statusBar.classList.add('correct');
    playerStatus.textContent = 'Correct';
  } else if (move === "incorrect") {
    // If the move was incorrect 
    statusBar.classList.add('incorrect');
    playerStatus.textContent = 'Incorrect';
  } else if (move === "clear") {
    statusBar.classList.remove('solved');
    statusBar.classList.remove('incorrect');
    statusBar.classList.remove('correct');
    // This is after the move so reverse below classes
    if (game.turn() === 'w') {
      statusBar.classList.add('black');
      playerStatus.textContent = 'Black to move'; 
    } else {
      statusBar.classList.add('white');
      playerStatus.textContent = 'White to move'; 
    }
  } else if (move === "start") {
    // Clear status to start
    statusBar.classList.remove('solved');
    statusBar.classList.remove('incorrect');
    statusBar.classList.remove('correct');
    if (game.turn() === 'w') {
      statusBar.classList.add('white');
      playerStatus.textContent = 'White to move'; 
    } else {
      statusBar.classList.add('black');
      playerStatus.textContent = 'Black to move'; 
    }
  }
}

// Check that the game is in the right state before moving a piece
let onDragStart = (source, piece, position, orientation) => {
  // If promotion window is open
  if (promoting === true) return false;
  // IF the puzzle is complete
  if (moveCount === totalMoves) return false;
  // do not pick up pieces if the game is over
  if (game.game_over()) return false

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false
  }
}

let onDrop = async (source, target) => {
  // Save the current position to load if the user makes the incorrect move
  let currentPOS = game.fen();
  // Get the piece that was moved
  let square = document.querySelector(`.square-${source}`);
  let piece = square.getElementsByTagName('img')[0].dataset.piece;

  // If that piece was a pawn and it landed on either row 1 or 8
  if (/[18]/.test(target[1]) && piece[1] === "P") {
    // Handle piece promotion
    await promote(source, target, piece);
  } 

  // see if the move is legal
  let move = game.move({
      from: source,
      to: target,
      // q = Queen, r = Rook, n = Knight, b = Bishop
      promotion: promotionPiece 
  });

  // illegal move
  if (move === null) return 'snapback';

  // If incorrect move
  if (game.fen() !== correctFENs[moveCount]) {
    // Update the UI under the board
    updateStatus('incorrect');

    // Revert the board and return
    setTimeout(() => {
      updateStatus('clear'); 
      game.load(currentPOS);
      board.position(game.fen());
      return 'snapback';
    }, 1000);

  } else if (game.fen() === correctFENs[moveCount]) {
    // If it is the correct move
    // Update the UI
    tip.classList.add("noDisplay");
    puzzleMoves.classList.remove("noDisplay");
    // Display the move under the puzzle title
    if (game.turn() === 'b') {
      puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> <span class="move move-${moveCount}">${correctMoves[moveCount]}</span>`);
    } else {
      if (moveCount === 0) {
        puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}...</span>`);
      }
      puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${moveCount}">${correctMoves[moveCount]}</span> `);
    }
    // Increment the UI move counter after user move
    moveCountUI++;
    // Increment the counter to track the current move
    moveCount++;

    // If puzzle is solved
    if (moveCount === totalMoves) {
      // Update the UI under the board
      updateStatus('solved');
      return;
    } else {
      // If puzzle is not solved
      updateStatus('correct');

      // Revert UI and make opponent move
      setTimeout(() => {
        updateStatus('clear');
        // Automate opponent moves
        makeNextMove();
      }, 750);
    }
  }
}

//  make opponent's move automatically or user's move through hint
let makeNextMove = (hint) => {
  // If there is a hint already active, user is promoting or if the soultion is shown then return
  if ((hintActive === true && hint) || (solutionShown === true && hint) || promoting === true) return;
  // If there is no valid move - return
  if (correctFENs[moveCount] === undefined) return;
  // Update the UI
  tip.classList.add("noDisplay");
  puzzleMoves.classList.remove("noDisplay");
  // Clear the moves if the solution is already shown
  if (moveCount === 0) puzzleMoves.textContent = "";
  // if it is a hint - activate hintActive
  hintActive = true;
  // Display next move under the title
  if (game.turn() === 'w') {
    puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> <span class="move move-${moveCount}">${correctMoves[moveCount]}</span>`);
    // Increment the UI move counter after user move
    moveCountUI++;
  } else {
    if (moveCount === 0) {
      puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}...</span>`);
      // Increment the UI move counter after user move
      moveCountUI++;
    }
    puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${moveCount}">${correctMoves[moveCount]}</span> `);
  }
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
  // Increment the counter to track the current move
  moveCount++;
  // Make sure correct player is prompted
  updateStatus('start');


  // Check if the puzzle is now solved
  if (moveCount === totalMoves) {
    // Update the UI under the board
    updateStatus('solved');
    solutionShown = true;
    hintActive = false;
    return;
  } 
  // Make the next move for the opponent
  if (hint) {
    setTimeout(makeNextMove, 500);
  } else {
    hintActive = false;
  }
}
  
// update the board position after the piece snap for castling, en passant, pawn promotion
let onSnapEnd = () => {
  board.position(game.fen());
}

// Handle piece promotion
let promote = async (source, target, piece) => {
  let currentPOS = game.fen();
  // Set the board orientation based on the players turn so the promotion window always shows on top
  let turn = game.turn() === 'w' ? "white" : "black";
  board.orientation(turn);

  // Move the pawn to the correct promotion square to hide it behind the promotion window
  let testMove = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });
  board.position(game.fen());
  // illegal move
  if (testMove === null) return 'snapback';

  // Reset the promotion piece
  promotionPiece = "";
  
  // Get the promotion piece
  await getPromotion(target, piece);

  if (promotionPiece !== "") {
    let targetSquare = document.querySelector(`.square-${target}`);
    targetSquare.getElementsByTagName('img')[0].src = `img/chesspieces/wikipedia/${piece[0]}${promotionPiece.toUpperCase()}.png`;
  }

  // Reload the actual position if closed
  if (closePromotionBlack === true || closePromotionWhite === true) {
    game.load(currentPOS);
    board.position(game.fen());
    setTimeout(() => {
      closePromotionBlack = false;
      closePromotionWhite = false;
      return;
    }, 750);
  }
  
  game.load(currentPOS);
}

let getPromotion = (target, piece) => {
    promoting = true;
    if (piece[0] === 'w') {
      // Show promotion options
      promotionWindowWhite.classList.remove('hide');
      // Style the window to hover of the right square
      promotionWindowWhite.classList.add(`promotion-${piece[0]}-${target[0]}`);
    } else {
      // Show promotion options
      promotionWindowBlack.classList.remove('hide');
      // Style the window to hover of the right square
      promotionWindowBlack.classList.add(`promotion-${piece[0]}-${target[0]}`);
    }

    // Wait for the user input to close the window and return the value
    return new Promise((resolve, reject) => {
      let getPiece = setInterval(() => {
        if (promotionPiece !== "" || closePromotionBlack === true || closePromotionWhite === true) {
          clearInterval(getPiece);
          resolve();
        }
      }, 100);
    });
}

let getPromotionPiece = (e) => {
  if (e.target.classList.contains("close-window-black")) closePromotionBlack = true;
  if (e.target.classList.contains("close-window-white")) closePromotionWhite = true;
  if (e.target.matches(".piece")) promotionPiece = e.target.closest('.promotion-piece').dataset.piece;
  if (promotionPiece !== "" || closePromotionBlack === true || closePromotionWhite === true) {
    clearPromotion();
  }
}

let clearPromotion = () => {
  for (let i = 0; i < 8; i++) {
    let char = String.fromCodePoint(i + 97);
    promotionWindowWhite.classList.remove(`promotion-w-${char}`);
    promotionWindowBlack.classList.remove(`promotion-b-${char}`);
  }
  promotionWindowWhite.classList.add('hide');
  promotionWindowBlack.classList.add('hide');
  promoting = false;
}

// Change between daily and random puzzles
let changePuzzleType = async () => {
  if (puzzleType.checked) {
    nextPuzzleBtn.textContent = "18";
    nextPuzzleBtn.classList.remove('hide');
    await nextPuzzle()
  } else {
    await init();
    nextPuzzleBtn.classList.add('hide');
    typeChanged = true;
  }
}

// Handle next puzzle button click
let nextPuzzle = async () => {
  // Add disabled styles
  nextPuzzleBtn.classList.add('disabled-button');
  // Start the next random puzzle
  await init("random");
  // Disable button click
  nextPuzzleBtn.disabled = true;

  let count = 17;
  // Set countdown timer on button
  let countdown = setInterval(() => {
    if (typeChanged === true) return clearInterval(countdown);
    if (count === 0) {
      nextPuzzleBtn.disabled = false;
      nextPuzzleBtn.textContent = "Next"
      // Remove disabled styles
      nextPuzzleBtn.classList.remove('disabled-button');
      // set typeChanged variable
      typeChanged = false;
      clearInterval(countdown);
    } else {
      nextPuzzleBtn.textContent = count;
      count--;
    }
  }, 1000);
}

// Show the solution to the puzzle under the board
let showSolution = () => {
  if (promoting === true) return;
  puzzleMoves.textContent = "";
  controlPanelRight.classList.remove('hide');
  tip.classList.add("noDisplay");
  puzzleMoves.classList.remove("noDisplay");
  let game = new Chess(dailyPuzzle.body.fen);
  let count = 1;
  solutionShown = true;

  if (game.turn() === 'w') {
    for (let i = 0; i < totalMoves; i++) {
      if (i % 2 === 0) {
        puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${count}.</span> <span class="move move-${i}">${correctMoves[i]}</span>`);
        count++;
      } else {
        puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${i}">${correctMoves[i]}</span> `);
      }
    }
  } else {
    for (let i = 0; i < totalMoves; i++) {
      if (i % 2 === 0) {
        if (i === 0) puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${count}...</span>`);
        puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${i}">${correctMoves[i]}</span> `);
      } else {
        count++;
        puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${count}.</span> <span class="move move-${i}">${correctMoves[i]}</span>`);
      }
    }
  }
}

// Reset board to starting position
let resetPuzzle = async () => {
  moveCount = 0;
  moveCountUI = 1;
  solutionShown = false;
  game.load(dailyPuzzle.body.fen);
  board.position(game.fen());
  // Update the UI
  clearPromotion();
  controlPanelRight.classList.add('hide');
  puzzleMoves.textContent = "";
  tip.classList.remove("noDisplay");
  puzzleMoves.classList.add("noDisplay");
  updateStatus("start");
}

let flipBoard = () => {
  if (promoting === true) return;
  else board.flip();
}

let playPuzzle = async () => {
  if (!playing) {
    // Update the UI
    tip.classList.add("noDisplay");
    puzzleMoves.classList.remove("noDisplay");
    // If there are no more moves
    if (moveCount === totalMoves) return;
    // else start playing
    playing = true;
    // Show pause icon
    playIcon.innerHTML = `<i class="fas fa-pause"></i>`;
  
    let play = setInterval(() => {
      // If paused clear interval
      if (playing === false) return clearInterval(play);
      // If this is the last clear the interval
      if (moveCount === totalMoves - 1) {
        clearInterval(play);
        playing = false;
        // Show play icon
        playIcon.innerHTML = `<i class="fas fa-play"></i>`;
        updateStatus('solved');
      }
      // Set the game to the FEN of the next move
      game.load(correctFENs[moveCount]);
      // Update the board to show the new position
      board.position(game.fen());
      // Increment the counter to track the current move
      moveCount++;
    }, 750);
  } else {
    // If the puzzle is already playing then return
    playing = false;
    // Show play icon
    playIcon.innerHTML = `<i class="fas fa-play"></i>`;
    return;
  }
}  

let getStartPosition = async () => {
  // Set the game to the FEN of the next move
  game.load(dailyPuzzle.body.fen);
  // Update the board to show the new position
  board.position(game.fen());
  // Increment the counter to track the current move
  moveCount = 0; 
}

let getPreviousPosition = async () => {
  if (moveCount === 0) return;
  let currentMove = moveCount - 1;
  let previousMove = currentMove - 1;

  if (previousMove < 0) {
    // Set the game to the FEN of the next move
    game.load(dailyPuzzle.body.fen);
    // Update the board to show the new position
    board.position(game.fen());
    // Increment the counter to track the current move
    moveCount--; 
    return;
  }

  // Set the game to the FEN of the next move
  game.load(correctFENs[previousMove]);
  // Update the board to show the new position
  board.position(game.fen());
  // Increment the counter to track the current move
  moveCount--;
}

let getNextPosition = async () => {
  // If the puzzle is complete - return
  if (moveCount === totalMoves) return;
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
  // Increment the counter to track the current move
  moveCount++;
}

let getLastPosition = async () => {
  // Set move count to total moves
  moveCount = totalMoves - 1;
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
}

let selectMove = (e) => {
  // If it is not the element we are looking for
  if (e.target.classList[0] !== 'move') return;
  // Clear the status before every move
  updateStatus("clear");
  // Update the movecount to the move number in the class list of the target
  moveCount = Number(e.target.classList[1].split("-")[1]);
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
  // If puzzle is solved
  if (moveCount === (totalMoves - 1)) {
    updateStatus("solved");
  }
};


// chessboardjs
let displayBoard = (puzzle) => {
  let orientation = game.turn() === 'w' ? 'white' : 'black';
  let config = {
    position: puzzle.body.fen,
    draggable: true,
    orientation: orientation,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  }
  board = Chessboard('board', config);
}

// Start the game with chess.js
let startGame = (puzzle) => {
  game = new Chess(puzzle.body.fen);
};

let init = async (random) => {
  // Set initial values of all variables
  resetVariables();
  // Get the daily puzzle informaiton from chess.com
  if (random) dailyPuzzle = await chessAPI.getDailyPuzzleRandom();
  else dailyPuzzle = await chessAPI.getDailyPuzzle();
  // Clear the promotion windows if they are open
  clearPromotion();
  // Display the puzzle informationon the screen
  displayInfo(dailyPuzzle);
  // Generate an array of FENs from the correct moves to test the user's moves against
  getCorrectMoves(dailyPuzzle);
  // Initialise the game with chess.js
  startGame(dailyPuzzle);
  // Display the starting board position
  displayBoard(dailyPuzzle);
  // Set the status bar
  updateStatus("start");
};

// Random Puzzle Controls
puzzleType.addEventListener('click', changePuzzleType);
// Next puzzle
nextPuzzleBtn.addEventListener('click', nextPuzzle);
// Promotion controls
promotionWindowWhite.addEventListener('click', getPromotionPiece);
promotionWindowBlack.addEventListener('click', getPromotionPiece);

// Control Panel
// Give hint
hintIcon.addEventListener('click', () => makeNextMove("hint"));
// Show solution
solutionIcon.addEventListener('click', showSolution);
// Reset game
resetIcon.addEventListener('click', resetPuzzle);
// Flip board
flipIcon.addEventListener('click', flipBoard);
// Play / Pause game
playIcon.addEventListener('click', playPuzzle);
// First move
startIcon.addEventListener('click', getStartPosition);
// Previous move
backIcon.addEventListener('click', getPreviousPosition);
// Next move
forwardIcon.addEventListener('click', getNextPosition);
// Last move
endIcon.addEventListener('click', getLastPosition);
// Select move
puzzleMoves.addEventListener('click', (e) => selectMove(e));

// Start the puzzle!
init();