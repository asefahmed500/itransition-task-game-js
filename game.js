const crypto = require('crypto');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to generate a fair random number
function fairRandom(min, max) {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const randomBytes = crypto.randomBytes(bytesNeeded);
    const randomValue = randomBytes.readUIntBE(0, bytesNeeded);
    return min + (randomValue % range);
}

// Function to validate dice configurations
function validateDice(dice) {
    if (dice.length < 3) {
        console.error("Error: At least three dice are required.");
        console.error("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
        process.exit(1);
    }
    for (let i = 0; i < dice.length; i++) {
        const values = dice[i].split(',').map(Number);
        if (values.length !== 6 || values.some(isNaN)) {
            console.error(`Error: Die ${i + 1} must contain exactly 6 integers.`);
            console.error("Example: 2,2,4,4,9,9");
            process.exit(1);
        }
    }
}

// Function to roll a die
function rollDie(die) {
    const values = die.split(',').map(Number);
    const index = fairRandom(0, values.length - 1);
    return values[index];
}

// Function to display the menu and get user choice
function getUserChoice(dice) {
    return new Promise((resolve) => {
        console.log("\nAvailable dice:");
        dice.forEach((die, index) => console.log(`${index + 1}: ${die}`));
        console.log("h: Help");
        console.log("x: Exit");

        rl.question("Choose a die (1, 2, 3, ...), h for help, or x to exit: ", (choice) => {
            if (choice === 'h') {
                console.log("Help: Select a die by entering its number. The computer will also select a die and both will roll. The higher roll wins.");
                resolve(getUserChoice(dice)); // Recursively call to get a valid choice
            } else if (choice === 'x') {
                console.log("Exiting game. Goodbye!");
                process.exit(0);
            } else if (!isNaN(choice) && choice >= 1 && choice <= dice.length) {
                resolve(choice - 1); // Return the index of the chosen die
            } else {
                console.log("Invalid choice. Please try again.");
                resolve(getUserChoice(dice)); // Recursively call to get a valid choice
            }
        });
    });
}

// Function to ask the user if they want to play again
function askPlayAgain() {
    return new Promise((resolve) => {
        rl.question("Play again? (y/n): ", (answer) => {
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Main game function
async function playGame(dice) {
    console.log("Welcome to the Non-Transitive Dice Game!");
    validateDice(dice);

    // Determine who goes first
    const firstMove = fairRandom(0, 1);
    console.log(`First move is determined by a fair coin toss: ${firstMove === 0 ? 'User' : 'Computer'} goes first.`);

    let userScore = 0;
    let computerScore = 0;

    while (true) {
        const userDieIndex = await getUserChoice(dice);
        const userRoll = rollDie(dice[userDieIndex]);
        console.log(`You rolled a ${userRoll} with die ${userDieIndex + 1}.`);

        const computerDieIndex = fairRandom(0, dice.length - 1);
        const computerRoll = rollDie(dice[computerDieIndex]);
        console.log(`Computer rolled a ${computerRoll} with die ${computerDieIndex + 1}.`);

        if (userRoll > computerRoll) {
            console.log("You win this round!");
            userScore++;
        } else if (computerRoll > userRoll) {
            console.log("Computer wins this round!");
            computerScore++;
        } else {
            console.log("It's a tie!");
        }

        console.log(`Score: User ${userScore} - Computer ${computerScore}`);
        const playAgain = await askPlayAgain();
        if (!playAgain) {
            console.log("Final Score:");
            console.log(`User: ${userScore}`);
            console.log(`Computer: ${computerScore}`);
            console.log("Thanks for playing!");
            break;
        }
    }

    rl.close(); // Close the readline interface
}

// Entry point
const dice = process.argv.slice(2);
playGame(dice);