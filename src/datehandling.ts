import { GraphQLScalarType } from 'graphql';

namespace Scalars {
    export const DateTime = new GraphQLScalarType({
        name: "DateTime",
        description: "A date with an associated time, given in ISO 8601 format.",
        serialize(value: Date) {
            return value.toISOString();
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