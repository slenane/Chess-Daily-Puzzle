import "../css/popup.css";
import ChessWebAPI from 'chess-web-api';
const chessAPI = new ChessWebAPI();
import Chess from 'chess.js';

let game, dailyPuzzle, board, correctMoves, correctFENs, totalMoves, moveCount, moveCountUI;

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
      puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> ${correctMoves[moveCount]}`);
    } else {
      puzzleMoves.insertAdjacentHTML('beforeend', ` ${correctMoves[moveCount]} `);
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
      }, 1000);
    }
  }
}

//  make opponent's move automatically or user's move through hint
let makeNextMove = (hint) => {
  // Clear the moves if the solution is already shown
  if (moveCount === 0) puzzleMoves.textContent = "";
  // If there is no valid move - return
  if (correctFENs[moveCount] === undefined) return;
  // Display next move under the title
  if (hint && game.turn() === 'w') {
    puzzleMoves.insertAdjacentHTML('beforeend', `<span class='move-number'>${moveCountUI}.</span> ${correctMoves[moveCount]}`);
    // Incremnet the UI move counter after user move
    moveCountUI++;
  } else {
    puzzleMoves.insertAdjacentHTML('beforeend', ` ${correctMoves[moveCount]} `);
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
    return;
  } 
  // Make the next move for the opponent
  if (hint) {
    setTimeout(makeNextMove, 1000);
  }
}
  
// update the board position after the piece snap for castling, en passant, pawn promotion
let onSnapEnd = () => {
  board.position(game.fen());
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
  await init();
  showSolution();
  updateStatus('solved');

  // ADD PAUSE
  let play = setInterval(() => {
    if (moveCount === totalMoves - 1) clearInterval(play)
    // Set the game to the FEN of the next move
    game.load(correctFENs[moveCount]);
    // Update the board to show the new position
    board.position(game.fen());
    // Increment the counter to track the current move
    moveCount++;
  }, 1000);
}  

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

let init = async () => {
  // Set initial values of all variables
  resetVariables();
  // Get the daily puzzle informaiton from chess.com
  dailyPuzzle = await chessAPI.getDailyPuzzle();
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

// Puzzle controls
// Give hint
hintIcon.addEventListener('click', () => makeNextMove("hint"));
// Show solution
solutionIcon.addEventListener('click', showSolution);
// Reset game
resetIcon.addEventListener('click', init);
// Flip board
flipIcon.addEventListener('click', () => board.flip())
// Play / Pause game
playIcon.addEventListener('click', playPuzzle)
// First move
// startIcon.addEventListener('click', )
// Previous move
// backIcon.addEventListener('click', )
// Next move
// forwardIcon.addEventListener('click', )
// Last move
// endIcon


// Start the game!
init();