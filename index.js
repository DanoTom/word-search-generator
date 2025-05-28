import React, { useState, useEffect } from 'https://cdn.skypack.dev/react';
import ReactDOM from 'https://cdn.skypack.dev/react-dom';

const WordSearchGenerator = () => {
  const [options, setOptions] = useState({
    width: 10,
    height: 10,
    font: 'Arial',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    level: ['horizontal', 'vertical']
  });
  const [wordsInput, setWordsInput] = useState('');
  const [wordSearch, setWordSearch] = useState([]);
  const [wordPositions, setWordPositions] = useState([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartCell, setSelectionStartCell] = useState(null);
  const [currentSelection, setCurrentSelection] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [animatingWordCoords, setAnimatingWordCoords] = useState(null); // { start: [x,y], end: [x,y], id: number }
  const [allWordsFound, setAllWordsFound] = useState(false);

  useEffect(() => {
    const words = wordsInput.split('\n').filter(word => word.trim() !== '');
    if (words.length > 0) {
      const { grid, positions } = generateWordSearch(words, options);
      setWordSearch(grid);
      setWordPositions(positions);
      // Reset foundWords, animatingWordCoords, and allWordsFound when words/options change
      setFoundWords([]);
      setAnimatingWordCoords(null);
      setAllWordsFound(false); 
    } else {
      // If wordsInput is empty, ensure game is reset
      setWordSearch([]);
      setWordPositions([]);
      setFoundWords([]);
      setAnimatingWordCoords(null);
      setAllWordsFound(false);
    }
  }, [wordsInput, options]);

  useEffect(() => {
    // Effect to clear animation state after animation duration
    if (animatingWordCoords) {
      const timer = setTimeout(() => {
        setAnimatingWordCoords(null);
      }, 500); // Must match animation duration in CSS
      return () => clearTimeout(timer); // Cleanup timer on unmount or if coords change
    }
  }, [animatingWordCoords]);

  useEffect(() => {
    // Effect to check if all words have been found
    const targetWordsArray = wordsInput.split('\n').map(w => w.trim().toUpperCase()).filter(w => w !== '');
    const targetWordCount = new Set(targetWordsArray).size;
    
    const uniqueFoundWordsCount = new Set(foundWords.map(fw => fw.word.toUpperCase())).size;

    if (targetWordCount > 0 && uniqueFoundWordsCount === targetWordCount) {
      setAllWordsFound(true);
    } else {
      setAllWordsFound(false);
    }
  }, [foundWords, wordsInput]);

  const generateWordSearch = (words, options) => {
    const grid = Array(options.height).fill(null).map(() => Array(options.width).fill(''));
    const positions = [];

    const placeWord = (word, direction) => {
      const dx = direction === 'horizontal' ? 1 : direction === 'diagonal' ? 1 : 0;
      const dy = direction === 'vertical' ? 1 : direction === 'diagonal' ? 1 : 0;
      const reverse = direction.startsWith('reverse');

      for (let attempt = 0; attempt < 100; attempt++) {
        let x = Math.floor(Math.random() * options.width);
        let y = Math.floor(Math.random() * options.height);

        if (x + word.length * dx <= options.width && y + word.length * dy <= options.height) {
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const char = reverse ? word[word.length - 1 - i] : word[i];
            if (grid[y + i * dy][x + i * dx] !== '' && grid[y + i * dy][x + i * dx] !== char) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              const char = reverse ? word[word.length - 1 - i] : word[i];
              grid[y + i * dy][x + i * dx] = char;
            }
            positions.push({
              word,
              start: [x, y],
              end: [x + (word.length - 1) * dx, y + (word.length - 1) * dy]
            });
            return true;
          }
        }
      }
      return false;
    };

    for (const word of words) {
      const availableDirections = options.level.flatMap(dir => 
        dir === 'reverse' ? ['reverse-horizontal', 'reverse-vertical', 'reverse-diagonal'] : dir
      );
      const direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
      placeWord(word.toUpperCase(), direction);
    }

    for (let y = 0; y < options.height; y++) {
      for (let x = 0; x < options.width; x++) {
        if (grid[y][x] === '') {
          grid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
      }
    }

    return { grid, positions };
  };

  // Extracted function for path calculation (from handleMouseEnter)
  // Calculates the cells forming a straight line (horizontal, vertical, or diagonal)
  // between a start cell and a current cell.
  const calculateSelectionPath = (startCell, currentCell) => {
    if (!startCell) return []; // Should not happen if mousedown has occurred

    const newSelection = []; // Array to store cells in the path
    const startX = startCell.x;
    const startY = startCell.y;
    const endX = currentCell.x;
    const endY = currentCell.y;

    const dxSign = Math.sign(endX - startX);
    const dySign = Math.sign(endY - startY);

    newSelection.push({ x: startX, y: startY });

    if (startX === endX && startY === endY) {
      // Single cell
    } else if (startX === endX) { // Vertical
      for (let i = 1; i <= Math.abs(endY - startY); i++) {
        newSelection.push({ x: startX, y: startY + i * dySign });
      }
    } else if (startY === endY) { // Horizontal
      for (let i = 1; i <= Math.abs(endX - startX); i++) {
        newSelection.push({ x: startX + i * dxSign, y: startY });
      }
    } else if (Math.abs(endX - startX) === Math.abs(endY - startY)) { // Diagonal
      for (let i = 1; i <= Math.abs(endX - startX); i++) {
        newSelection.push({ x: startX + i * dxSign, y: startY + i * dySign });
      }
    } else {
      // Path is not strictly horizontal, vertical, or 45-degree diagonal
      // Return only the starting cell to indicate an invalid drag path from that point
      return [{ x: startX, y: startY }];
    }
    return newSelection; // Return the calculated path
  };
  
  const handleMouseDown = (x, y) => {
    setIsSelecting(true);
    const startCell = { x, y };
    setSelectionStartCell(startCell);
    setCurrentSelection(calculateSelectionPath(startCell, startCell));
  };

  const handleMouseEnter = (x, y) => {
    if (!isSelecting || !selectionStartCell) return;
    setCurrentSelection(calculateSelectionPath(selectionStartCell, { x, y }));
  };

  // Extracted function for word validation (from handleMouseUp)
  // Checks if the selected cells form a valid, correctly placed, new word.
  const validateAndProcessSelection = (
    currentSelectionToValidate, // Array of {x, y} cells from user's selection
    wordSearchGrid,             // The 2D array representing the word search grid
    targetWordsInputString,     // Raw string from the words input textarea
    wordPositionsArray,         // Array of {word, start, end} for all placed words
    foundWordsArray             // Array of words already found by the user
  ) => {
    // Basic checks for valid inputs
    if (!currentSelectionToValidate || currentSelectionToValidate.length === 0 || !wordSearchGrid || wordSearchGrid.length === 0) {
      return { wasFound: false, word: null, details: null };
    }

    // Construct the string from the selected cells on the grid
    let selectedString = "";
    for (const cell of currentSelectionToValidate) {
      if (wordSearchGrid[cell.y] && wordSearchGrid[cell.y][cell.x] !== undefined) {
        selectedString += wordSearchGrid[cell.y][cell.x];
      } else {
        // This case should ideally not be reached if selection is always within grid bounds
        // console.error("Error: Attempted to access an invalid or undefined cell in wordSearchGrid during validation.", cell);
        return { wasFound: false, word: null, details: null }; // Grid access error
      }
    }
    selectedString = selectedString.toUpperCase(); // Standardize to uppercase for comparison

    // Prepare target words and the reversed version of the selected string
    const targetWords = targetWordsInputString.split('\n').filter(word => word.trim() !== '').map(w => w.toUpperCase());
    const reversedSelectedString = selectedString.split('').reverse().join('');

    let actualWordFound = null;
    let foundWordDetails = null;

    if (targetWords.includes(selectedString) || targetWords.includes(reversedSelectedString)) {
      const selStartPos = currentSelectionToValidate[0];
      const selEndPos = currentSelectionToValidate[currentSelectionToValidate.length - 1];

      for (const pos of wordPositionsArray) {
        const placedWord = pos.word.toUpperCase();

        if (placedWord === selectedString) {
          if ((pos.start[0] === selStartPos.x && pos.start[1] === selStartPos.y && pos.end[0] === selEndPos.x && pos.end[1] === selEndPos.y) ||
              (pos.start[0] === selEndPos.x && pos.start[1] === selEndPos.y && pos.end[0] === selStartPos.x && pos.end[1] === selStartPos.y)) {
            actualWordFound = pos.word;
            foundWordDetails = pos;
            break;
          }
        }
        
        if (placedWord === reversedSelectedString) {
          if ((pos.start[0] === selStartPos.x && pos.start[1] === selStartPos.y && pos.end[0] === selEndPos.x && pos.end[1] === selEndPos.y) ||
              (pos.start[0] === selEndPos.x && pos.start[1] === selEndPos.y && pos.end[0] === selStartPos.x && pos.end[1] === selStartPos.y)) {
            actualWordFound = pos.word; // Keep original casing from wordPositions
            // Store details, ensuring the 'word' field in details matches the one to be stored (original casing)
            foundWordDetails = { ...pos, word: pos.word }; 
            break;
          }
        }
      }
    }

    // Check if the word was found and is not already in the list of foundWords (case-insensitive)
    if (actualWordFound && !foundWordsArray.some(fw => fw.word.toUpperCase() === actualWordFound.toUpperCase())) {
      return { wasFound: true, word: actualWordFound, details: foundWordDetails };
    }

    // If no valid, new word is found
    return { wasFound: false, word: null, details: null };
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    const validationResult = validateAndProcessSelection(
      currentSelection,
      wordSearch,
      wordsInput,
      wordPositions,
      foundWords
    );

    if (validationResult.wasFound) {
      setFoundWords(prev => [...prev, {
        word: validationResult.word,
        start: validationResult.details.start,
        end: validationResult.details.end
      }]);
      setAnimatingWordCoords({ start: validationResult.details.start, end: validationResult.details.end, id: Date.now() });
    }
    
    setCurrentSelection([]);
    setSelectionStartCell(null);
  };

  const isCellPartOfAnyFoundWord = (cellX, cellY, foundWordsArray) => {
    if (!foundWordsArray || foundWordsArray.length === 0) {
      return false;
    }
    for (const foundWordData of foundWordsArray) {
      const { start, end } = foundWordData;
      const startX = start[0];
      const startY = start[1];
      const endX = end[0];
      const endY = end[1];

      // Determine direction of the found word
      const dxSign = Math.sign(endX - startX);
      const dySign = Math.sign(endY - startY);
      
      let currentX = startX;
      let currentY = startY;
      
      // Check if cellX, cellY is on the path of this foundWordData
      // Loop from start to end of the found word
      while (true) {
        if (currentX === cellX && currentY === cellY) {
          return true; // Cell is part of this found word
        }
        if (currentX === endX && currentY === endY) {
          break; // Reached end of this word's path
        }
        // Move to the next cell in the word's path
        if (dxSign !== 0) currentX += dxSign;
        if (dySign !== 0) currentY += dySign;

        // Safety break in case of issues, e.g. if start/end are same but cell isn't matching.
        // This also handles single-letter words correctly.
        if (dxSign === 0 && dySign === 0 && (startX !== cellX || startY !== cellY)) {
            break;
        }
      }
    }
    return false; // Cell is not part of any found word
  };

  const isCellPartOfAnimatingWord = (cellX, cellY, animatingCoords) => {
    if (!animatingCoords) {
      return false;
    }
    const { start, end } = animatingCoords;
    const startX = start[0];
    const startY = start[1];
    const endX = end[0];
    const endY = end[1];

    const dxSign = Math.sign(endX - startX);
    const dySign = Math.sign(endY - startY);
    
    let currentX = startX;
    let currentY = startY;
    
    while (true) {
      if (currentX === cellX && currentY === cellY) {
        return true;
      }
      if (currentX === endX && currentY === endY) {
        break;
      }
      if (dxSign !== 0) currentX += dxSign;
      if (dySign !== 0) currentY += dySign;
      if (dxSign === 0 && dySign === 0 && (startX !== cellX || startY !== cellY)) {
          break;
      }
    }
    return false;
  };

  const copyToClipboard = () => {
    const text = wordSearch.map(row => row.join(' ')).join('\n');
    navigator.clipboard.writeText(text);
  };

  const exportSVG = (includeAnswers) => {
    const cellSize = 30;
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${options.width * cellSize}" height="${options.height * cellSize}">
        <rect width="100%" height="100%" fill="${options.backgroundColor}"/>
        ${wordSearch.map((row, y) => 
          row.map((char, x) => 
            `<text x="${x * cellSize + cellSize/2}" y="${y * cellSize + cellSize/2 + 5}" font-family="${options.font}" font-size="20" fill="${options.textColor}" text-anchor="middle">${char}</text>`
          ).join('')
        ).join('')}
        ${includeAnswers ? wordPositions.map(({ start, end }) => `
          <line x1="${start[0] * cellSize + cellSize/2}" y1="${start[1] * cellSize + cellSize/2}" 
                x2="${end[0] * cellSize + cellSize/2}" y2="${end[1] * cellSize + cellSize/2}" 
                stroke="red" stroke-width="2"/>
        `).join('') : ''}
      </svg>
    `;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = includeAnswers ? 'word-search-with-answers.svg' : 'word-search.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      {/* Victory Modal */}
      {allWordsFound && (
        <div className="victory-modal animate-fadeIn">
          <div className="victory-modal-content">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Congratulations!</h2>
            <p className="text-lg">You found all the words!</p>
            <button onClick={() => setWordsInput('')}>
              Play Again?
            </button>
          </div>
        </div>
      )}

      <div className="w-full md:w-1/3">
        <h2 className="text-xl font-bold mb-2">Options</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Width: {options.width}</label>
            <input
              type="range"
              min="5"
              max="20"
              value={options.width}
              onChange={(e) => setOptions(prev => ({ ...prev, width: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Height: {options.height}</label>
            <input
              type="range"
              min="5"
              max="20"
              value={options.height}
              onChange={(e) => setOptions(prev => ({ ...prev, height: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Font</label>
            <select
              value={options.font}
              onChange={(e) => setOptions(prev => ({ ...prev, font: e.target.value }))}
              className="w-full p-2 border rounded"
            >
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Times New Roman">Times New Roman</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Background Color</label>
            <input
              type="color"
              value={options.backgroundColor}
              onChange={(e) => setOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Text Color</label>
            <input
              type="color"
              value={options.textColor}
              onChange={(e) => setOptions(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block mb-1">Level</label>
            <select
              value={options.level.join(',')}
              onChange={(e) => setOptions(prev => ({ ...prev, level: e.target.value.split(',') }))}
              className="w-full p-2 border rounded"
            >
              <option value="horizontal,vertical">Horizontal & Vertical</option>
              <option value="horizontal,vertical,diagonal">Horizontal, Vertical & Diagonal</option>
              <option value="horizontal,vertical,diagonal,reverse">All Directions</option>
            </select>
          </div>
        </div>
      </div>
      <div className="w-full md:w-2/3 space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Words to Find</h2>
          <textarea
            placeholder="Enter words, one per line (e.g., HELLO)"
            value={wordsInput}
            onChange={(e) => setWordsInput(e.target.value)}
            rows="3" 
            className="w-full p-2 border rounded mb-2" // Added mb-2 for spacing
          />
          {/* Display list of words to find, with strikethrough for found words */}
          <ul className="mt-2 list-disc pl-5"> 
            {wordsInput.split('\n').filter(word => word.trim() !== '').map((word, index) => {
              const isWordFound = foundWords.some(fw => fw.word.toUpperCase() === word.trim().toUpperCase());
              return (
                <li key={index} className={`text-sm ${isWordFound ? 'line-through text-gray-500' : ''}`}>
                  {word.trim()}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Word Search</h2>
          <div
            style={{
              fontFamily: options.font,
              backgroundColor: options.backgroundColor,
              color: options.textColor,
              display: 'grid',
              gridTemplateColumns: `repeat(${options.width}, 1fr)`,
              gap: '4px',
              justifyItems: 'center',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            {wordSearch.map((row, y) =>
              row.map((char, x) => {
                const isCurrentlySelected = currentSelection.some(cell => cell.x === x && cell.y === y);
                const isFound = isCellPartOfAnyFoundWord(x, y, foundWords);
                const isAnimating = isCellPartOfAnimatingWord(x, y, animatingWordCoords);

                let cellBackgroundColor = 'transparent';
                if (isFound && !isAnimating) { // Don't apply static found color if animating
                  cellBackgroundColor = 'lightgreen';
                } else if (isCurrentlySelected && !isAnimating) { // Don't apply selection color if animating
                  cellBackgroundColor = 'lightblue';
                }
                // If isAnimating is true, the animation class handles background color

                return (
                  <div
                    key={`${x}-${y}`}
                    className={isAnimating ? 'animate-pop' : ''}
                    style={{
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: cellBackgroundColor, // Will be overridden by animation if class applied
                      userSelect: 'none', // Prevent text selection during drag
                    }}
                    onMouseDown={() => handleMouseDown(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    // onMouseUp is handled by the container now
                  >
                    {char}
                  </div>
                );
              })
            )}
            {showAnswers && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {wordPositions.map(({ start, end }, index) => (
                  <line
                    key={index}
                    x1={`${(start[0] + 0.5) * (100 / options.width)}%`}
                    y1={`${(start[1] + 0.5) * (100 / options.height)}%`}
                    x2={`${(end[0] + 0.5) * (100 / options.width)}%`}
                    y2={`${(end[1] + 0.5) * (100 / options.height)}%`}
                    stroke="red"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            )}
          </div>
          <div className="mt-4 space-x-2">
            <button onClick={copyToClipboard} className="bg-blue-500 text-white px-4 py-2 rounded">Copy to Clipboard</button>
            <button onClick={() => exportSVG(false)} className="bg-green-500 text-white px-4 py-2 rounded">Export as SVG</button>
            <button onClick={() => setShowAnswers(!showAnswers)} className="bg-yellow-500 text-white px-4 py-2 rounded">
              {showAnswers ? 'Hide Answers' : 'Show Answers'}
            </button>
            <button onClick={() => exportSVG(true)} className="bg-red-500 text-white px-4 py-2 rounded">Export SVG with Answers</button>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<WordSearchGenerator />, document.getElementById('root'));

// --- UNIT TESTS ---
// Note: These tests run in the browser console when the script loads.
// They are for development and verification purposes.

const assertEqual = (actual, expected, message) => {
  // Simple deep comparison for arrays of objects
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`PASS: ${message}`);
  } else {
    console.error(`FAIL: ${message}`);
    console.log("  Expected:", expectedStr);
    console.log("  Actual:  ", actualStr);
  }
};

const testCalculateSelectionPath = () => {
  console.log("--- Testing calculateSelectionPath ---");
  let path;

  // Horizontal path
  path = calculateSelectionPath({ x: 0, y: 0 }, { x: 3, y: 0 });
  assertEqual(path, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], "Horizontal path (0,0) to (3,0)");

  // Vertical path
  path = calculateSelectionPath({ x: 1, y: 1 }, { x: 1, y: 4 });
  assertEqual(path, [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }], "Vertical path (1,1) to (1,4)");

  // Diagonal path (top-left to bottom-right)
  path = calculateSelectionPath({ x: 0, y: 0 }, { x: 2, y: 2 });
  assertEqual(path, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], "Diagonal path (0,0) to (2,2)");

  // Diagonal path (top-right to bottom-left)
  path = calculateSelectionPath({ x: 2, y: 0 }, { x: 0, y: 2 });
  assertEqual(path, [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }], "Diagonal path (2,0) to (0,2)");
  
  // Diagonal path (bottom-left to top-right)
  path = calculateSelectionPath({ x: 0, y: 2 }, { x: 2, y: 0 });
  assertEqual(path, [{ x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }], "Diagonal path (0,2) to (2,0)");

  // Invalid path (knight's move) - should return only start cell
  path = calculateSelectionPath({ x: 0, y: 0 }, { x: 1, y: 2 });
  assertEqual(path, [{ x: 0, y: 0 }], "Invalid path (knight's move) returns start cell");

  // Single cell path
  path = calculateSelectionPath({ x: 1, y: 1 }, { x: 1, y: 1 });
  assertEqual(path, [{ x: 1, y: 1 }], "Single cell path (1,1) to (1,1)");
  
  // Path calculation with null startCell
  path = calculateSelectionPath(null, { x: 1, y: 1 });
  assertEqual(path, [], "Path with null startCell returns empty array");
};

const testValidateAndProcessSelection = () => {
  console.log("--- Testing validateAndProcessSelection ---");
  const sampleGrid = [
    ['C', 'A', 'T', 'X'],
    ['D', 'P', 'E', 'Y'],
    ['G', 'O', 'D', 'Z'], // GOD backwards is DOG
    ['W', 'O', 'R', 'L', 'D']
  ];
  const sampleTargetWordsInput = "CAT\nDOG\nAPE\nWORLD\nTEST";
  const sampleWordPositions = [
    { word: "CAT", start: [0, 0], end: [2, 0] }, // Horizontal forward
    { word: "DOG", start: [2, 2], end: [0, 2] }, // Horizontal backward (GOD on grid)
    { word: "APE", start: [1,0], end: [1,2]}, // Vertical A(1,0) P(1,1) E(1,2) - actually uses P from grid
    { word: "WORLD", start: [0,3], end: [4,3]}, // Horizontal WORLD
  ];
  let currentFoundWords = [];
  let result;

  // Test Case 1: Correctly select a forward horizontal word ("CAT")
  let selection1 = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  result = validateAndProcessSelection(selection1, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, true, "Find valid 'CAT' (forward horizontal)");
  assertEqual(result.word, "CAT", "Find valid 'CAT' - word check");
  if(result.wasFound) currentFoundWords.push({word: result.word, start: result.details.start, end: result.details.end});


  // Test Case 2: Correctly select a backward horizontal word ("DOG" which is "GOD" on grid)
  let selection2 = [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }]; // Selecting G,O,D
  result = validateAndProcessSelection(selection2, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, true, "Find valid 'DOG' (backward horizontal as GOD)");
  assertEqual(result.word, "DOG", "Find valid 'DOG' - word check");
  if(result.wasFound) currentFoundWords.push({word: result.word, start: result.details.start, end: result.details.end});


  // Test Case 3: Correctly select a forward vertical word ("APE")
  // Grid has C A T
  //           D P E
  //           G O D
  // APE is wordPositions: { word: "APE", start: [1,0], end: [1,2]}
  // So grid cells are: A at (1,0), P at (1,1), E at (1,2)
  let selection3 = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }];
  result = validateAndProcessSelection(selection3, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, true, "Find valid 'APE' (forward vertical)");
  assertEqual(result.word, "APE", "Find valid 'APE' - word check");
  if(result.wasFound) currentFoundWords.push({word: result.word, start: result.details.start, end: result.details.end});

  // Test Case 4: Select valid letters that form a word ("APE") BUT are NOT correctly placed
  // Let's say grid has A, P, E elsewhere not matching wordPositions
  const tempGridMisplaced = [
      ['A', 'X', 'X'],
      ['P', 'Y', 'Y'],
      ['E', 'Z', 'Z']
  ];
  const tempWordPositionsMisplaced = [ { word: "APE", start: [0,0], end: [0,2] } ]; // Correct placement
  let selection4 = [{x:0,y:0}, {x:1,y:0}, {x:2,y:0}]; // User selects A,X,X which is not APE
  result = validateAndProcessSelection(selection4, tempGridMisplaced, "APE", tempWordPositionsMisplaced, currentFoundWords);
  assertEqual(result.wasFound, false, "Select 'AXX' as 'APE' (misplaced word, string mismatch)");

  let selection4b = [{x:0,y:0}, {x:0,y:1}, {x:0,y:2}]; // User selects A,P,E correctly string-wise
  // But let's say wordPositions defines APE as horizontal
  const tempWordPositionsMisplaced2 = [ { word: "APE", start: [0,0], end: [2,0] } ];
  result = validateAndProcessSelection(selection4b, tempGridMisplaced, "APE", tempWordPositionsMisplaced2, currentFoundWords);
  assertEqual(result.wasFound, false, "Select 'APE' (correct string, but wrong placement type - vertical vs horizontal)");


  // Test Case 5: Select letters that do not form any word from targetWords
  let selection5 = [{ x: 0, y: 1 }, { x: 1, y: 1 }]; // "DP" from sampleGrid
  result = validateAndProcessSelection(selection5, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, false, "Select 'DP' (not a target word)");

  // Test Case 6: Select a word that is already in foundWords ("CAT")
  // currentFoundWords already contains CAT from Test Case 1
  result = validateAndProcessSelection(selection1, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, false, "Select 'CAT' again (already found)");
  
  // Test Case 7: Select a partial word ("WOR" from "WORLD")
  let selection7 = [{x:0,y:3},{x:1,y:3},{x:2,y:3}]; // W,O,R
  result = validateAndProcessSelection(selection7, sampleGrid, sampleTargetWordsInput, sampleWordPositions, currentFoundWords);
  assertEqual(result.wasFound, false, "Select partial word 'WOR'");

  // Test Case 8: Correctly select a backward diagonal word (Requires setup)
  const diagGrid = [
    ['X','X','D'],
    ['X','O','X'],
    ['G','X','X']
  ];
  const diagTarget = "DOG";
  const diagPositions = [{word: "DOG", start: [2,0], end: [0,2]}]; // D(2,0) O(1,1) G(0,2)
  let selection8 = [{x:2,y:0}, {x:1,y:1}, {x:0,y:2}];
  result = validateAndProcessSelection(selection8, diagGrid, diagTarget, diagPositions, []);
  assertEqual(result.wasFound, true, "Find valid 'DOG' (backward diagonal D(2,0)O(1,1)G(0,2))");
  assertEqual(result.word, "DOG", "Find valid 'DOG' (backward diagonal) - word check");

  // Test Case 9: Select a forward diagonal word (Requires setup)
  const diagGrid2 = [
    ['C','X','X'],
    ['X','A','X'],
    ['X','X','T']
  ];
  const diagTarget2 = "CAT";
  const diagPositions2 = [{word: "CAT", start: [0,0], end: [2,2]}]; // C(0,0) A(1,1) T(2,2)
  let selection9 = [{x:0,y:0}, {x:1,y:1}, {x:2,y:2}];
  result = validateAndProcessSelection(selection9, diagGrid2, diagTarget2, diagPositions2, []);
  assertEqual(result.wasFound, true, "Find valid 'CAT' (forward diagonal C(0,0)A(1,1)T(2,2))");

};

const testIsCellPartOfAnyFoundWord = () => {
  console.log("--- Testing isCellPartOfAnyFoundWord ---");
  const foundWordsList = [
    { word: "CAT", start: [0, 0], end: [2, 0] }, // Horizontal
    { word: "DOG", start: [0, 1], end: [0, 3] }, // Vertical D(0,1) O(0,2) G(0,3)
    { word: "FLY", start: [1, 1], end: [3, 3] }  // Diagonal F(1,1) L(2,2) Y(3,3)
  ];

  // Cell is part of a horizontal found word
  assertEqual(isCellPartOfAnyFoundWord(1, 0, foundWordsList), true, "Cell (1,0) in horizontal 'CAT'");
  // Cell is part of a vertical found word
  assertEqual(isCellPartOfAnyFoundWord(0, 2, foundWordsList), true, "Cell (0,2) in vertical 'DOG'");
  // Cell is part of a diagonal found word
  assertEqual(isCellPartOfAnyFoundWord(2, 2, foundWordsList), true, "Cell (2,2) in diagonal 'FLY'");
  
  // Cell is NOT part of any found word
  assertEqual(isCellPartOfAnyFoundWord(5, 5, foundWordsList), false, "Cell (5,5) not in any word");

  // Cell is at the start of a found word
  assertEqual(isCellPartOfAnyFoundWord(0, 0, foundWordsList), true, "Cell (0,0) start of 'CAT'");
  // Cell is at the end of a found word
  assertEqual(isCellPartOfAnyFoundWord(0, 3, foundWordsList), true, "Cell (0,3) end of 'DOG'");
  // Cell is in the middle of a found word
  assertEqual(isCellPartOfAnyFoundWord(2, 2, foundWordsList), true, "Cell (2,2) middle of 'FLY'");

  // Empty foundWords array
  assertEqual(isCellPartOfAnyFoundWord(1, 0, []), false, "Cell (1,0) with empty foundWords list");
};


// --- Run Tests ---
// To run tests, uncomment the lines below.
// Make sure to check the browser console for output.

// testCalculateSelectionPath();
// testValidateAndProcessSelection();
// testIsCellPartOfAnyFoundWord();

// Note: The tests for validateAndProcessSelection are extensive and cover many cases.
// The `isCellPartOfAnimatingWord` is structurally identical to `isCellPartOfAnyFoundWord` 
// so a separate test suite for it is redundant if `isCellPartOfAnyFoundWord` passes.
