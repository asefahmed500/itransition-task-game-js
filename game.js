const crypto = require('crypto');
const readline = require('readline');
const Table = require('cli-table');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class Dice {
    constructor(values) {
        this.values = values;
    }

    roll() {
        const index = FairRandomGenerator.fairRandom(0, this.values.length - 1);
        return this.values[index];
    }
}

class FairRandomGenerator {
    static generateKey() {
        return crypto.randomBytes(32).toString('hex'); // 256-bit key
    }

    static generateHMAC(key, message) {
        return crypto.createHmac('sha3-256', key).update(message).digest('hex');
    }

    static fairRandom(min, max) {
        const range = max - min + 1;
        const randomBytes = crypto.randomBytes(4);
        const randomValue = randomBytes.readUInt32BE(0);
        return min + (randomValue % range);
    }
}

class DiceParser {
    static parseDice(args) {
        if (args.length < 3) {
            console.error("Error: At least three dice are required.");
            console.error("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
            process.exit(1);
        }
        return args.map(arg => {
            const values = arg.split(',').map(Number);
            if (values.length !== 6 || values.some(isNaN)) {
                console.error(`Error: Die must contain exactly 6 integers.`);
                console.error("Example: 2,2,4,4,9,9");
                process.exit(1);
            }
            return new Dice(values);
        });
    }
}

class ProbabilityCalculator {
    static calculateProbabilities(dice) {
        const table = new Table({
            head: ['User Dice \\ Computer Dice', ...dice.map((_, i) => `Die ${i + 1}`)]
        });

        dice.forEach((userDie, i) => {
            const row = [`Die ${i + 1}`];
            dice.forEach((computerDie, j) => {
                if (i === j) {
                    row.push('-');
                } else {
                    const probability = this.calculateWinProbability(userDie, computerDie);
                    row.push(probability.toFixed(4));
                }
            });
            table.push(row);
        });

        return table.toString();
    }

    static calculateWinProbability(userDie, computerDie) {
        let userWins = 0;
        userDie.values.forEach(userValue => {
            computerDie.values.forEach(computerValue => {
                if (userValue > computerValue) userWins++;
            });
        });
        return userWins / (userDie.values.length * computerDie.values.length);
    }
}

class Game {
    constructor(dice) {
        this.dice = dice;
    }

    async play() {
        console.log("Welcome to the Non-Transitive Dice Game!");

        // Determine who goes first
        const firstMove = await this.determineFirstMove();
        console.log(`First move is determined: ${firstMove === 0 ? 'User' : 'Computer'} goes first.`);

        let userScore = 0;
        let computerScore = 0;

        while (true) {
            const userDieIndex = await this.getUserChoice();
            const userRoll = await this.fairRoll(this.dice[userDieIndex].values.length, "your throw");
            console.log(`Your throw is ${this.dice[userDieIndex].values[userRoll]}.`);

            const computerDieIndex = FairRandomGenerator.fairRandom(0, this.dice.length - 1);
            const computerRoll = await this.fairRoll(this.dice[computerDieIndex].values.length, "computer's throw");
            console.log(`Computer's throw is ${this.dice[computerDieIndex].values[computerRoll]}.`);

            if (this.dice[userDieIndex].values[userRoll] > this.dice[computerDieIndex].values[computerRoll]) {
                console.log("You win this round!");
                userScore++;
            } else if (this.dice[userDieIndex].values[userRoll] < this.dice[computerDieIndex].values[computerRoll]) {
                console.log("Computer wins this round!");
                computerScore++;
            } else {
                console.log("It's a tie!");
            }

            console.log(`Score: User ${userScore} - Computer ${computerScore}`);
            const playAgain = await this.askPlayAgain();
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

    async determineFirstMove() {
        const key = FairRandomGenerator.generateKey();
        const computerChoice = FairRandomGenerator.fairRandom(0, 1);
        const hmac = FairRandomGenerator.generateHMAC(key, computerChoice.toString());
        console.log(`I selected a random value in the range 0..1 (HMAC=${hmac}).`);
        console.log("Try to guess my selection.");
        console.log("0 - 0");
        console.log("1 - 1");
        console.log("X - exit");
        console.log("? - help");

        const userChoice = await this.getUserInput();
        if (userChoice === 'x') {
            console.log("Exiting game. Goodbye!");
            process.exit(0);
        } else if (userChoice === '?') {
            console.log("Help: Select 0 or 1 to guess the computer's choice. The computer will reveal the key after your choice.");
            return this.determineFirstMove();
        } else {
            const result = (computerChoice + parseInt(userChoice)) % 2;
            console.log(`My selection: ${computerChoice} (KEY=${key}).`);
            return result;
        }
    }

    async fairRoll(range, description) {
        const key = FairRandomGenerator.generateKey();
        const computerChoice = FairRandomGenerator.fairRandom(0, range - 1);
        const hmac = FairRandomGenerator.generateHMAC(key, computerChoice.toString());
        console.log(`I selected a random value in the range 0..${range - 1} for ${description} (HMAC=${hmac}).`);
        console.log(`Add your number modulo ${range}.`);
        for (let i = 0; i < range; i++) {
            console.log(`${i} - ${i}`);
        }
        console.log("X - exit");
        console.log("? - help");

        const userChoice = await this.getUserInput();
        if (userChoice === 'x') {
            console.log("Exiting game. Goodbye!");
            process.exit(0);
        } else if (userChoice === '?') {
            console.log(`Help: Select a number between 0 and ${range - 1} to add to the computer's choice. The result will be used to determine the roll.`);
            return this.fairRoll(range, description);
        } else {
            const result = (computerChoice + parseInt(userChoice)) % range;
            console.log(`My number is ${computerChoice} (KEY=${key}).`);
            console.log(`The result is ${computerChoice} + ${userChoice} = ${result} (mod ${range}).`);
            return result;
        }
    }

    async getUserChoice() {
        console.log("\nAvailable dice:");
        this.dice.forEach((die, index) => console.log(`${index + 1}: ${die.values.join(',')}`));
        console.log("h: Help");
        console.log("x: Exit");

        const choice = await this.getUserInput();
        if (choice === 'h') {
            console.log("Help: Select a die by entering its number. The computer will also select a die and both will roll. The higher roll wins.");
            console.log(ProbabilityCalculator.calculateProbabilities(this.dice));
            return this.getUserChoice();
        } else if (choice === 'x') {
            console.log("Exiting game. Goodbye!");
            process.exit(0);
        } else if (!isNaN(choice) && choice >= 1 && choice <= this.dice.length) {
            return choice - 1;
        } else {
            console.log("Invalid choice. Please try again.");
            return this.getUserChoice();
        }
    }

    async getUserInput() {
        return new Promise((resolve) => {
            rl.question("Your selection: ", (answer) => {
                resolve(answer.trim().toLowerCase());
            });
        });
    }

    async askPlayAgain() {
        return new Promise((resolve) => {
            rl.question("Play again? (y/n): ", (answer) => {
                resolve(answer.toLowerCase() === 'y');
            });
        });
    }
}

// Entry point
const diceArgs = process.argv.slice(2);
const dice = DiceParser.parseDice(diceArgs);
const game = new Game(dice);
game.play();