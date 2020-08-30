import chalk from "chalk";

export default class Logger {
    static debug(...args: any[]) {
        if(process.env.NODE_ENV !== "development") return;
        console.log(chalk.blue("ℹ"), ...args);
    }

    static success(...args: any[]) {
        console.log(chalk.green('✔'), ...args);
    }
}