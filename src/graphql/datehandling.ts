import { GraphQLScalarType, Kind } from 'graphql';

namespace Scalars {
    export const DateTime = new GraphQLScalarType({
        name: "DateTime",
        description: "A date with an associated time, given in ISO 8601 format.",
        serialize(value: Date) {
            return value.toISOString();
        },
        parseValue(date: string | number) {
            if (typeof date === "number") {
                return new Date(date * 1000);
            }

            const parsed = new Date(date);
            if (Number.isNaN(parsed.getTime())) {
                return null;
            }
            return date;
        },
        parseLiteral(ast) {
            let parsed: Date;
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
        }
    });
}

export default Scalars;