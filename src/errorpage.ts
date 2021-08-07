import { Application } from "express";
import { Configuration } from "oidc-provider";
import { readFileSync } from "fs";
import { join } from "path";

let flavorTexts: string[] = [];
try {
    flavorTexts = readFileSync(join(__dirname, "../errormessages.txt"), "utf8").split("\n").map(msg => msg.trim()).filter(msg => msg.length > 0);
} catch (e) {
    console.error(`Error obtaining flavor texts: ${e}`);
}
if (flavorTexts.length === 0) {
    flavorTexts.push("An error occurred.");
}

/**
 * Creates a function that renders an oidc-provider error.
 * @param app - Express application
 * @returns a renderError function for oidc-provider
 */
export default function errorPage(app: Application): Configuration["renderError"] {
    return async (ctx, out, err) => {
        if (out.error === "server_error") console.error(err);
        ctx.body = await new Promise((res, rej) => {
            app.render("error", { 
                ...out,
                status: ctx.status,
                flavor: flavorTexts[Math.floor(Math.random() * flavorTexts.length)]
            }, (err, html) => {
                err ? rej(err) : res(html!);
            });
        });
    }
}