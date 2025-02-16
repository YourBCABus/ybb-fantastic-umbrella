import { Express, Request, Response } from 'express';
import crypto from 'crypto'; 

export default class UptimeStatusService {
    private name: string;
    private maxHeartbeatSecs: number;
    private lastHeartbeat: Date;
    private stopFn: (() => void) | null;

    #token: string; // Actually private so it doesn't show up in logs

    constructor(name: string) {
        this.name = name;
        this.maxHeartbeatSecs = Infinity;
        this.lastHeartbeat = new Date();
        this.stopFn = null;

        this.#token = "";
    }

    public setMaxHeartbeatTime(seconds: number): this {
        this.maxHeartbeatSecs = seconds;
        return this;
    }
    public setToken(token: string): this {
        this.#token = token;
        return this;
    }

    public get last(): Date {
        return new Date(this.lastHeartbeat.getTime());
    }

    public start(app: Express) {
        if (this.stopFn) {
            throw new Error(`Uptime service for \`${this.name}\` is already running`);
        }

        const heartbeatRoute = `/uptime/${this.name}/heartbeat`;
        const getRoute = `/uptime/${this.name}/last`;

        const token = Buffer.from(this.#token);
        const service = this;

        function heartbeat(req: Request, res: Response) {
            // If the token query parameter is correct, update lastHeartbeat
            // with the timestamp.
            const reqToken = req.query.token;
            if (!reqToken || typeof reqToken !== 'string') {
                res.status(401).send("UNAUTHORIZED");
            } else if (!crypto.timingSafeEqual(Buffer.from(reqToken), token)) {
                res.status(403).send("FORBIDDEN");
            } else {
                res.status(200).send("OK");
                service.lastHeartbeat = new Date();
            }
        }
        function get(_req: Request, res: Response) {
            const elapsed = Date.now() - service.lastHeartbeat.getTime();

            res.send({
                lastPing: service.lastHeartbeat.getTime(),
                elapsedSecs: elapsed / 1000,
                stale: elapsed / 1000 > service.maxHeartbeatSecs,
            });
        }

        app.put(heartbeatRoute, heartbeat);
        app.get(getRoute, get);

        this.stopFn = () => {
            // Remove heartbeat route
            for (let i = 0; i < app.routes.put.length; i++) {
                if (app.routes.put[i].path === heartbeatRoute) {
                    app.routes.put.splice(i, 1);
                }
            }

            for (let i = 0; i < app.routes.get.length; i++) {
                if (app.routes.get[i].path === getRoute) {
                    app.routes.get.splice(i, 1);
                }
            }
        };
    }

    public stop() {
        if (!this.stopFn) {
            throw new Error(`Uptime service for \`${this.name}\` is not running`);
        } 
        this.stopFn();
        this.stopFn = null;
    }

    public get running(): boolean {
        return !!this.stopFn;
    }
}
