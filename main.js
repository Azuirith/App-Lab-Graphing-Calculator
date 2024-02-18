// DEFINE CONSTANTS
var NUM_GRID_LINES = 20;

var CANVAS_WIDTH = getProperty("graphCanvas", "width");
var CANVAS_HEIGHT = getProperty("graphCanvas", "height");

var HORIZONTAL_SPACING = CANVAS_WIDTH / NUM_GRID_LINES;
var VERTICAL_SPACING = CANVAS_HEIGHT / NUM_GRID_LINES;

var FOCUS_LINE_COLOR = rgb(10, 10, 10, 1);
var FOCUS_LINE_WIDTH = 1.5;
var GRID_LINE_COLOR = rgb(10, 10, 10, 0.3);
var GRID_LINE_WIDTH = 1;

// DEFINE GLOBAL VARIABLES
var points = [];

var step = 0.1;
var lineGapValue = 1;

// RUNTIME CODE
setActiveCanvas("graphCanvas"); // Sets up the UI element that the points
                                // are drawn on
updateScreen();

// Sets up user input events
onEvent("zoomInButton", "click", onZoomIn);
onEvent("zoomOutButton", "click", onZoomOut);
onEvent("equationInputBox", "keypress", onEquationBoxInput);

// FUNCTION DEFINITIONS
function onZoomIn()
{
  var ZOOM_IN_SCALE = 0.5;
  lineGapValue *= ZOOM_IN_SCALE; // Scales the line spacing down based on the ZOOM_IN_SCALE value
  step *= ZOOM_IN_SCALE; // Scales the spacing between rendered points down based on the ZOOM_IN_SCALE value
  updateScreen();
}

// Does the same thing as onZoomIn() but scales the values up
function onZoomOut()
{
  var ZOOM_OUT_SCALE = 2;
  lineGapValue *= ZOOM_OUT_SCALE;
  step *= ZOOM_OUT_SCALE;
  updateScreen();
}

// Updates the screen if the user inputs an equation by hitting enter
function onEquationBoxInput(key)
{
  var ENTER_KEY_CHARCODE = 13;
  if (key.charCode == ENTER_KEY_CHARCODE) updateScreen();
}

// Calculates a Y value for every X value within the current graph
function calculatePoints(equation)
{
  var calculatedPoints = [];
  var leftBound = -(NUM_GRID_LINES / 2) * lineGapValue;
  var rightBound = NUM_GRID_LINES / 2 * lineGapValue;
  
  // Goes from the left to the right side of the screen, gets an X value (stored in i) that is spaced from
  // the last by the step value, and uses the X value and the equation to get the Y value
  for (var i = leftBound; i < rightBound; i += step)
  {
    appendItem(calculatedPoints, {x: i, y: evaluateEquation(equation, i)});
  }
  
  return calculatedPoints;
}

// Takes in an X value and an equation as parameters and finds the value of the
// equation at that X value
function evaluateEquation(equation, x)
{
  if (isNumber(equation)) return parseFloat(equation); 
  else if (equation == "x") return x;
  
  // Cleans up equation to make it easier to evaluate
  equation = simplifyEquation(equation);
  // Handles equations in simplest form
  
  var evaluatedEquation;
  
  // Evaluates parenthetical expressions first, since they are evaluated differently
  // than the rest of the operators
  while (equation.includes("("))
  {
    var leftParenthesisIndex = equation.indexOf("(");
    var rightParenthesisIndex = equation.indexOf(")");
    
    // Evaluates the equation in between the parentheses so that the parentheses can be removed
    var innerEquation = equation.substring(leftParenthesisIndex + 1, rightParenthesisIndex);
    var innerValue = evaluateEquation(innerEquation, x);
    
    // Inserts the evaluated equation in place of the parenthetical one
    evaluatedEquation = equation.substring(0, leftParenthesisIndex);
    evaluatedEquation += innerValue;
    evaluatedEquation += equation.substring(rightParenthesisIndex + 1, equation.length);
    
    // Continues evaluating the rest of the equation
    return evaluateEquation(evaluatedEquation, x);
  }
  
  var operator1 = "^"; // Starts with the highest priority operator after parentheses
  var operator2; // Used for operators with equal priority, since both operators 
                 // need to be searched for
  if (!equation.includes("^")) 
  {
    operator1 = "*";
    operator2 = "/";
  }
  if (!equation.includes("*") && !equation.includes("/") && operator1 != "^") 
  {
    operator1 = "+";
    operator2 = "-";
  }
  
  var firstNum;
  var secondNum;

  // Loops over the equation to see if the operators specified above appear in the equation
  var searchStartIndex = 0; // Using a search start index prevents the program mistaking
                            // negatives for minus operators
  while (equation.indexOf(operator1, searchStartIndex) != -1 || equation.indexOf(operator2, searchStartIndex) != -1)
  {
    // Decides which operator should be searched for based on where they occur 
    // in the equation
    var operator1Index = equation.indexOf(operator1, searchStartIndex);
    var operator2Index = equation.indexOf(operator2, searchStartIndex);
    var operator = operator1Index > operator2Index ? operator1 : operator2;
    var operatorIndex = equation.indexOf(operator, searchStartIndex);
      
    // Handles the calculation of the new search index in the case
    // that the program detects a minus sign that represents a negative sign
    if (operator == "-")
    {
      if (isNumber(equation[operatorIndex + 1])
          && !isNumber(equation[operatorIndex - 1]) 
          && equation[operatorIndex - 1] != "x")
      {
        searchStartIndex = operatorIndex + 1;
        continue;
      }
      else if (equation[operatorIndex - 1] == "e")
      {
        searchStartIndex = operatorIndex + 1;
        continue;
      }
    }
    
    // Calculates the first number based on the position of the operator
    for (var i = operatorIndex - 1;  i >= -1; i--)
    {
      var currentChar = equation[i];
      var previousChar = equation[i - 1];
      
      // Skips over numbers and symbols that do not mark the end of the number
      if (isNumber(currentChar)) continue;
      else if (currentChar == ".") continue;
      else if (currentChar == "x") continue;
      
      // Skips over things indicating scientific notation, as they do not mark the
      // end of the number
      else if (currentChar == "e") continue;
      else if (currentChar == "-" && previousChar == "e") continue;
      
      // Grabs the first number from the equation based on if it's negative or not
      if (currentChar == "-" && !isNumber(previousChar))
      {
        firstNum = equation.substring(i, operatorIndex);
      }
      else
      {
        firstNum = equation.substring(i + 1, operatorIndex);
      }
    
      break;
    }
    
    // Calculates the second number based on the position of the operator
    // (works almost identically to the loop above)
    for (var i = operatorIndex + 1; i <= equation.length; i++)
    {
      var currentChar = equation[i];
      var previousChar = equation[i - 1];
      
      if (isNumber(currentChar)) continue;
      else if (currentChar == ".") continue;
      else if (currentChar == "-" && i - 1 == operatorIndex) continue; // If it's a negative sign
      
      else if (currentChar == "e") continue;
      else if (currentChar == "-" && previousChar == "e") continue;
      
      // Grabs the second number from the equation based on if the loop has reached
      // the end of the equation or if the current symbol is an X
      if (currentChar == undefined || currentChar == "x")
      {
        secondNum = equation.substring(operatorIndex + 1, i + 1);
      }
      else
      {
        secondNum = equation.substring(operatorIndex + 1, i);
      }
      
      break;
    }
  
    // Done so that the new equation can be constructed properly
    var firstNumLength = firstNum.length; 
    var secondNumLength = secondNum.length;
    
    // Evaluates and converts numbers to floats rather than strings
    if (!isNumber(firstNum)) firstNum = evaluateEquation(firstNum, x);
    firstNum = parseFloat(firstNum);
    if (!isNumber(secondNum)) secondNum = evaluateEquation(secondNum, x);
    secondNum = parseFloat(secondNum);
    
    var result;
    
    // Operates on the numbers based on the user input
    if (operator == "^") result = Math.pow(firstNum, secondNum);
    else if (operator == "*") result = firstNum * secondNum;
    else if (operator == "/") result = firstNum / secondNum;
    else if (operator == "+") result = firstNum + secondNum;
    else result = firstNum - secondNum;
    
    // Inserts the result into the equation
    evaluatedEquation = equation.substring(0, operatorIndex - firstNumLength);
    evaluatedEquation += result;
    evaluatedEquation += equation.substring(operatorIndex + secondNumLength + 1, equation.length + 1);

    // Continues evaluating the rest of the equation
    return evaluateEquation(evaluatedEquation, x);
  }
}

// Evaluates if the equation can be processed or not
function checkEquationValidity(equationText)
{ 
  // Marks equation as invalid if there is no equation
  if (equationText.length <= 0) return false; 
  
  var ALLOWED_EQUATION_SYMBOLS = ["x", "+", "-", "*", "/", "^", "(", ")", "."];
  
  // Ensures that all parentheses have their respective closing parentheses
  var numOpenParentheses = 0;
  var numClosedParentheses = 0;
  
  for (var i = 0; i < equationText.length; i++)
  {
    var previousChar = equationText[i - 1];
    var currentChar = equationText[i];
    var nextChar = equationText[i + 1];

    if (currentChar == "(") numOpenParentheses++;
    else if (currentChar == ")") numClosedParentheses++;

    // Makes sure that each character in the equation is a valid symbol unless it's a number
    if (!isNumber(currentChar) && ALLOWED_EQUATION_SYMBOLS.indexOf(currentChar) == -1) return false;
    
    // Makes sure that numbers precede decimals
    if (currentChar == "." && previousChar == "x") return false;
    
    // Disallows repeating x's and numbers following directly after x's
    if (currentChar == "x" && nextChar == "x") return false; 
    else if (currentChar == "x" && isNumber(nextChar)) return false;
    
    // Makes sure that operator symbols are followed by something
    if (!isNumber(currentChar) && currentChar != "x" && nextChar == undefined) return false;
  }
  
  // Makes sure that all opening parentheses are closed with closing parentheses and vice versa
  if (numOpenParentheses != numClosedParentheses) return false;
  else return true; // If the equation passes all of these checks, it is valid
}

// Translates graph coordinates such as (1, 1) to their respective 
// coordinates on the screen, such as (150, 150)
function graphToScreenCoordinates(x, y)
{
  x *= HORIZONTAL_SPACING / lineGapValue;
  y *= -(VERTICAL_SPACING / lineGapValue);
  
  // Adjusts coordinates to center
  x += CANVAS_WIDTH / 2;
  y += CANVAS_HEIGHT / 2;
  
  var newPoint = {x: x, y: y};
  return newPoint;
}

function drawGridLines()
{
  setStrokeWidth(GRID_LINE_WIDTH);
  for (var i = 0; i < NUM_GRID_LINES; i++)
  {
    if (i == NUM_GRID_LINES / 2)
    {
      setStrokeColor(FOCUS_LINE_COLOR); // Central lines are darker
    }
    else
    {
      setStrokeColor(GRID_LINE_COLOR);
    }
      
    line(HORIZONTAL_SPACING * i, 0, HORIZONTAL_SPACING * i, CANVAS_HEIGHT);
    line(0, VERTICAL_SPACING * i, CANVAS_WIDTH, VERTICAL_SPACING * i);
  }
}

function drawPoints()
{
  // Bolds and darkens equation graph line
  setStrokeColor(FOCUS_LINE_COLOR);
  setStrokeWidth(FOCUS_LINE_WIDTH);
  
  if (points.length == 0) return;
  
  for (var i = 0; i < points.length - 1; i++)
  {
    // Casts each point's graph coordinates to screen coordinates
    var currentPoint = graphToScreenCoordinates(points[i].x, points[i].y);
    var nextPoint = graphToScreenCoordinates(points[i + 1].x, points[i + 1].y);
    
    // Draws a line between the current point and the next point
    line(currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y);
  }
}

// Clears graph, calculates the points based on the current equation
// in the equation box, and then draws the point. Mostly just
// connects all of the functions defined above
function updateScreen()
{
  clearCanvas();
  drawGridLines();
  
  var equation = getText("equationInputBox").toLowerCase();
  var equationIsValid = checkEquationValidity(equation);
  if (!equationIsValid) 
  {
    points = [];
    if (equation.length != 0) setProperty("invalidEquationLabel", "hidden", false);
    else setProperty("invalidEquationLabel", "hidden", true);
  }
  else
  {
    points = calculatePoints(equation);
    setProperty("invalidEquationLabel", "hidden",  true);
  }
  
  drawPoints();
}

// Used for convenience and readability
function isNumber(num)
{
  return !isNaN(num);
}

// Loops over the equation and edits it to make it able to be evaluated
// evaluateEquation() function 
function simplifyEquation(equation)
{
  var newEquation = equation;
  
  // While loop is used rather an a for loop since the length of the
  // equation may change within the loop, which must be accounted for
  var i = 0;
  while (i < equation.length)
  {
    var previousChar = equation[i - 1];
    var currentChar = equation[i];
    var nextChar = equation[i + 1];
    
    if (currentChar == "-")
    {
      if (nextChar == "-") // If two consecutive minus signs are found, they will be turned into
                           // one plus sign
      {
        newEquation = equation.substring(0, i);
        newEquation += "+";
        newEquation += equation.substring(i + 2, equation.length);
      }
      else if (previousChar == undefined && !isNumber(nextChar)) // Adds a
                                                                 // -1 coefficient where needed
      {
        newEquation = "-1*";
        newEquation += equation.substring(i + 1, equation.length);
      }
    }
    else if (currentChar == "x" && isNumber(previousChar)) // Inserts a multiplication symbol
                                                           // between Xs and their coefficients
    {
      newEquation = equation.substring(0, i);
      newEquation += "*";
      newEquation += equation.substring(i, equation.length);
    }
    
    equation = newEquation;
    i++;
  } 
  
  return newEquation;
}
