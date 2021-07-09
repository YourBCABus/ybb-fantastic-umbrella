import { GraphQLScalarType, Kind } from 'graphql';

/**
 * GraphQL scalars used in YourBCABus.
 */
namespace Scalars {
    export const DateTime = new GraphQLScalarType({
        name: "DateTime",
        description: "A date with an associated time, given in ISO 8601 format.",
        serialize(value: Date) {
            return value.toISOString();
        },
        parseValue(date: unknown) {
            if (typeof date === "number") {
                return new Date(date * 1000);
            }

            if (typeof date === "string") {
                const parsed = new Date(date);
                if (Number.isNaN(parsed.getTime())) {
                    return null;
                }
                return date;
            }

            return null;
        },
        parseLiteral(ast) {
            let parsed: Date | undefined;
            if (ast.kind === Kind.STRING) {
                parsed = new Date(ast.value);
            } else if (ast.kind === Kind.INT) {
                parsed = new Date(parseInt(ast.value, 10) * 1000);
            }
            if (parsed && !Number.isNaN(parsed.getTime())) {
                return parsed;
            }
            return null;
        }
    });
    export const Time = new GraphQLScalarType({
        name: "Time",
        description: "A time without a date, given in ISO 8601 format. Usually provided in the school's timeZone.",
        serialize(value: number) {
            const hour = Math.floor(value / 3600) % 24;
            const minute = Math.floor(value / 60) % 60;
            const second = Math.floor(value) % 60;

            return `T${("0" + hour).slice(-2)}:${("0" + minute).slice(-2)}:${("0" + second).slice(-2)}`;
        },
        parseValue(time: unknown) {
            if (typeof time !== "string" && typeof time !== "number") return null;
            return parseTime(time);
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.STRING || ast.kind === Kind.INT) return parseTime(ast.value);
            return null;
        }
    });
}

function parseTime(time: string | number): number | null {
    if (typeof time === "number") {
        if (time < 0 || time > 24 * 60 * 60) return null;
        return time;
    }

    const timeRegex = /^T?([0-9]{2})\:?([0-9]{2})\:?([0-9]{2})?$/;
    const match = time.match(timeRegex);
    if (!match) return null;

    const [_, hour, minute, second] = match;
    const parsed = parseInt(hour) * 60 * 60 + parseInt(minute) * 60 + (second ? parseInt(second) : 0);
    if (parsed < 0 || parsed > 24 * 60 * 60) return null;
    return parsed;
}

export default Scalars;