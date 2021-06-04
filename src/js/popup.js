import "../css/popup.css";
import ChessWebAPI from 'chess-web-api';
const chessAPI = new ChessWebAPI();
import Chess from 'chess.js';

let game, dailyPuzzle, board, correctMoves, correctFENs, totalMoves, moveCount, moveCountUI;
let playing = false;
let hintActive = false;

let resetVariables = () => {
  game = undefined;
  dailyPuzzle = undefined;
  board = null;
  correctMoves = [];
  correctFENs = [];
  totalMoves = 0; 
  moveCount = 0;
  moveCountUI = 1;
  controlPanelRight.classList.add('hide');
  puzzleMoves.textContent = "";
}

// Puzzle type
let puzzleType = document.querySelector('.random-slider');
let nextPuzzleBtn = document.querySelector('.next-puzzle-button');
// UI
let statusBar = document.querySelector('.status-bar');
let playerStatus = document.querySelector('.status');
let puzzleTitle = document.querySelector('.title');
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

let displayInfo = (puzzle) => {
  puzzleTitle.textContent = puzzle.body.title;
  puzzleURL.href = puzzle.body.url;
};

let getCorrectMoves = (puzzle) => {
  // parse the puzzle's PGN with a regular expression
  correctMoves = (puzzle.body.pgn).match('(?:\\r\\n\\r\\n)(.*)')[1];
  // Split the resulting array and filter for legal moves
  correctMoves = correctMoves.split(/(\d)\.|\s/);
  correctMoves = correctMoves.filter(i => i !== undefined && i.length > 1 );
  // SOLVE THIS PROBLEM A BETTER WAY
  if (correctMoves[correctMoves.length -1] === '1-0' || correctMoves[correctMoves.length -1] === '0-1') correctMoves.splice(correctMoves.length - 1, 1);
  // Keep track of how many moves are in the puzzle 
  totalMoves = correctMoves.length;
  // Generate a new table to make the moves
  let pos = new Chess(puzzle.body.fen);
  correctMoves.forEach(move => {
    correctFENs.push(getFEN(move, pos));
  });
}

let getFEN = (move, pos) => {
  // Make the move
  pos.move(move);
  // Return the resulting FEN
  return pos.fen();
}

let updateStatus = (move) => {
  statusBar.classList.remove('white');
  statusBar.classList.remove('black');

  // Check if the puzzle has been solved
  if (move === "solved") {
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

let onDragStart = (source, piece, position, orientation) => {
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
  
let onDrop = (source, target) => {
  // Save the current position to load if the user makes the incorrect move
  let currentPOS = game.fen();
  // see if the move is legal
  let move = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
  })

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
    // If it is the correct move
  } else if (game.fen() === correctFENs[moveCount]) {
    // Display the move under the puzzle title
    if (game.turn() === 'b') {
      puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> <span class="move move-${moveCount}">${correctMoves[moveCount]}</span>`);
    } else {
      puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${moveCount}">${correctMoves[moveCount]}</span> `);
    }
    // Incremnet the UI move counter after user move
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
  // If there is a hint already active then return
  if (hintActive === true && hint) return;
  // Clear the moves if the solution is already shown
  if (moveCount === 0) puzzleMoves.textContent = "";
  // If there is no valid move - return
  if (correctFENs[moveCount] === undefined) return;
  // if it is a hint - activate hintActive
  hintActive = true;
  // Display next move under the title
  if (hint && game.turn() === 'w') {
    puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> <span class="move move-${moveCount}">${correctMoves[moveCount]}</span>`);
    // Incremnet the UI move counter after user move
    moveCountUI++;
  } else {
    puzzleMoves.insertAdjacentHTML('beforeend', ` <span class="move move-${moveCount}">${correctMoves[moveCount]}</span> `);
  }
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
  // Increment the counter to track the current move
  moveCount++;
  // Make sure correct player is prompted
  playerStatus.textContent = game.turn() === 'w' ? 'White to move' : 'Black to move'; 

  // Check if the puzzle is now solved
  if (moveCount === totalMoves) {
    // Update the UI under the board
    updateStatus('solved');
    hintActive = false;
    return;
  } 
  // Make the next move for the opponent
  if (hint) {
    setTimeout(makeNextMove, 750);
  } else {
    hintActive = false;
  }
}
  
// update the board position after the piece snap for castling, en passant, pawn promotion
let onSnapEnd = () => {
  board.position(game.fen());
}

let changePuzzleType = async () => {
  if (puzzleType.checked) {
    nextPuzzleBtn.textContent = "18";
    nextPuzzleBtn.classList.remove('hide');
    await nextPuzzle()
  } else {
    await init();
    nextPuzzleBtn.classList.add('hide');
  }
}

let nextPuzzle = async () => {
  // Start the next random puzzle
  await init("random");
  // Disable button click
  nextPuzzleBtn.disabled = true;
  let count = 17;
  // Set countdown timer on button
  let countdown = setInterval(() => {
    if (count === 0) {
      nextPuzzleBtn.disabled = false;
      nextPuzzleBtn.textContent = "Next"
      clearInterval(countdown);
    } else {
      nextPuzzleBtn.textContent = count;
      count--;
    }
  }, 1000);
}

// Show the solution to the puzzle under the board
let showSolution = () => {
  let game = new Chess(dailyPuzzle.body.fen);
  let count = 1;
  let moves = [];

  if (game.turn() === 'w') {
    for (let i = 0; i < totalMoves; i++) {
      if (i % 2 === 0) {
        moves.push(`${count}. ${correctMoves[i]}`);
        count++;
      } else {
        moves.push(` ${correctMoves[i]} `);
      }
    }
  } else {
    for (let i = 0; i < totalMoves; i++) {
      if (i % 2 === 0) {
        moves.push(`${correctMoves[i]}`);
      } else {
        count++;
        moves.push(` ${count}. ${correctMoves[i]} `);
      }
    }
  }
  puzzleMoves.textContent = moves.join("");
}

let playPuzzle = async () => {
  if (!playing) {
    // Set the game to the FEN of the next move
    game.load(dailyPuzzle.body.fen);
    // Update the board to show the new position
    board.position(game.fen());
    // Increment the counter to track the current move
    moveCount = 0; 
    playing = true;
  
    let play = setInterval(() => {
      // If this is the last clear the interval
      if (moveCount === totalMoves - 1) {
        clearInterval(play);
        playing = false;
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
  if (e.target.classList[0] !== 'move') return;
  // Update the movecount to the move number in the class list of the target
  moveCount = e.target.classList[1].split("-")[1];
  console.log(moveCount);
  // Set the game to the FEN of the next move
  game.load(correctFENs[moveCount]);
  // Update the board to show the new position
  board.position(game.fen());
};


// chessboardjs
// Display chessbaord and update if move is correct
let displayBoard = (puzzle) => {
  let config = {
    position: puzzle.body.fen,
    draggable: true,
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
  console.log(dailyPuzzle);
  // Display the puzzle informationon the screen
  displayInfo(dailyPuzzle);
  // Display the starting board position
  displayBoard(dailyPuzzle);
  // Generate an array of FENs from the correct moves to test the user's moves against
  getCorrectMoves(dailyPuzzle);
  // Initialise the game with chess.js
  startGame(dailyPuzzle);
  // Set the status bar
  updateStatus("start");
};

// Random Puzzle Controls
puzzleType.addEventListener('click', changePuzzleType);
// Next puzzle
nextPuzzleBtn.addEventListener('click', nextPuzzle);

// Control Panel
// Give hint
hintIcon.addEventListener('click', () => makeNextMove("hint"));
// Show solution
solutionIcon.addEventListener('click', showSolution);
// Reset game
resetIcon.addEventListener('click', () => init());
// Flip board
flipIcon.addEventListener('click', () => board.flip());
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